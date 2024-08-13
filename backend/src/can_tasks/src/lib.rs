use std::{cell::RefCell, time::Duration};

use candid::{CandidType, Principal};
use ic_cdk::{
    api::time,
    caller, export_candid, init, post_upgrade, pre_upgrade, query, spawn,
    storage::{stable_restore, stable_save},
    trap, update,
};
use serde::Deserialize;
use shared::{
    humans::{api::MintRewardsRequest, client::HumansCanisterClient},
    proof::{last_reputation_reliant_action_at, start_cleanup_interval_for_rep_reliant_actions},
    reputation::{api::MintRepRequest, client::ReputationCanisterClient},
    task_archive::api::{
        GetArchivedTaskIdsRequest, GetArchivedTaskIdsResponse, GetArchivedTasksByIdRequest,
        GetArchivedTasksByIdResponse,
    },
    tasks::{
        api::{
            AttachToTaskRequest, AttachToTaskResponse, BackToEditTaskRequest,
            BackToEditTaskResponse, CreateTaskRequest, CreateTaskResponse, DeleteRequest,
            DeleteResponse, EditTaskRequest, EditTaskResponse, EvaluateRequest, EvaluateResponse,
            FinishEditTaskRequest, FinishEditTaskResponse, FinishSolveRequest, FinishSolveResponse,
            GetTaskIdsRequest, GetTaskIdsResponse, GetTasksByIdRequest, GetTasksByIdResponse,
            GetTasksStatsRequest, GetTasksStatsResponse, SolveTaskRequest, SolveTaskResponse,
            StartSolveTaskRequest, StartSolveTaskResponse,
        },
        state::TasksState,
    },
    votings::types::ONE_DAY_NS,
    Guard, ENV_VARS,
};

#[derive(CandidType, Deserialize)]
pub struct InitRequest {
    pub task_archive_canister_id: Principal,
}

#[init]
fn init_hook(req: InitRequest) {
    with_state_mut(|s| s.task_archive_canister_id = req.task_archive_canister_id);

    start_archiving_timer();
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    with_state(|s| stable_save((s,)).expect("Unable to stable save"))
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (tasks_state,): (TasksState,) = stable_restore().expect("Unable to stable restore");
    with_state_mut(|s| *s = tasks_state);

    start_archiving_timer();
    start_cleanup_interval_for_rep_reliant_actions();
}

#[update]
#[allow(non_snake_case)]
fn tasks__create_task(mut req: CreateTaskRequest) -> CreateTaskResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to create task");

        s.create_task(req, caller(), time())
    })
}

#[update]
#[allow(non_snake_case)]
fn tasks__edit_task(mut req: EditTaskRequest) -> EditTaskResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to edit task");

        s.edit_task(req)
    })
}

#[update]
#[allow(non_snake_case)]
fn tasks__finish_edit_task(mut req: FinishEditTaskRequest) -> FinishEditTaskResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to finish editing task");

        s.finish_edit_task(req)
    })
}

#[update]
#[allow(non_snake_case)]
fn tasks__start_solve_task(mut req: StartSolveTaskRequest) -> StartSolveTaskResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to start solving task");

        s.start_solve_task(req, time())
    })
}

#[update]
#[allow(non_snake_case)]
fn tasks__back_to_edit_task(mut req: BackToEditTaskRequest) -> BackToEditTaskResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to revert task to edit stage");

        s.back_to_edit_task(req)
    })
}

#[update]
#[allow(non_snake_case)]
fn tasks__solve_task(mut req: SolveTaskRequest) -> SolveTaskResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to solve task");

        s.solve_task(req, caller(), time())
    })
}

#[update]
#[allow(non_snake_case)]
fn tasks__attach_to_task(mut req: AttachToTaskRequest) -> AttachToTaskResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to attach to task");

        s.attach_to_task(req, caller())
    })
}

#[update]
#[allow(non_snake_case)]
fn tasks__finish_solve_task(mut req: FinishSolveRequest) -> FinishSolveResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to finish solving task");

        s.finish_solve_task(req)
    })
}

#[update]
#[allow(non_snake_case)]
async fn tasks__evaluate_task(mut req: EvaluateRequest) -> EvaluateResponse {
    let task_id = req.id;

    let (result, rewards) = with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to evaluate task");

        s.evaluate_task(req)
    });

    let reputation_canister = ReputationCanisterClient::new(ENV_VARS.reputation_canister_id);
    let mint_rep_req = MintRepRequest {
        entries: rewards
            .iter()
            .map(|it| it.as_reputation_mint_entry())
            .filter(|it| it.is_some())
            .map(|it| it.unwrap())
            .collect(),
    };

    let humans_canister = HumansCanisterClient::new(ENV_VARS.humans_canister_id);
    let mint_rewards_req = MintRewardsRequest { rewards };

    if !mint_rewards_req.rewards.is_empty() {
        // TODO: add rescheduling
        if let Err((code, msg)) = humans_canister.humans__mint_rewards(mint_rewards_req).await {
            trap(&format!(
                "FATAL!!! Unable to mint rewards: [{:?}] {}",
                code, msg
            ));
        }
    }

    if !mint_rep_req.entries.is_empty() {
        // TODO: add rescheduling
        if let Err((code, msg)) = reputation_canister.reputation__mint(mint_rep_req).await {
            trap(&format!(
                "FATAL!!! Unable to mint reputation: [{:?}] {}",
                code, msg
            ));
        }
    }

    with_state_mut(|s| s.archive_task(task_id));

    result
}

#[update]
#[allow(non_snake_case)]
fn tasks__delete_task(mut req: DeleteRequest) -> DeleteResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to delete task");

        s.delete_task(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn tasks__get_tasks_by_id(mut req: GetTasksByIdRequest) -> GetTasksByIdResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get tasks by id");

        s.get_tasks_by_id(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn tasks__get_tasks(mut req: GetTaskIdsRequest) -> GetTaskIdsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get tasks");

        s.get_task_ids(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn task_archive__get_archived_tasks(
    mut req: GetArchivedTaskIdsRequest,
) -> GetArchivedTaskIdsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get archived tasks");

        s.get_archived_task_ids(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn task_archive__get_archived_tasks_by_id(
    mut req: GetArchivedTasksByIdRequest,
) -> GetArchivedTasksByIdResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get archived tasks by id");

        s.get_archived_tasks_by_id(req)
    })
}

#[query]
fn get_archive_error() -> Option<(u64, String)> {
    with_state(|s| s.last_archive_error.clone())
}

#[query]
#[allow(non_snake_case)]
fn tasks__get_tasks_stats(mut req: GetTasksStatsRequest) -> GetTasksStatsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get tasks stats");

        s.get_task_stats(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn _tasks__get_my_create_task_timestamp() -> u64 {
    last_reputation_reliant_action_at(&caller())
}

fn start_archiving_timer() {
    ic_cdk_timers::set_timer_interval(Duration::from_nanos(ONE_DAY_NS), || {
        if let Some((client, req)) = with_state_mut(|s| s.prepare_archive_batch()) {
            spawn(async move {
                let resp = client
                    .task_archive__append_batch(&req)
                    .await
                    .map_err(|(c, m)| format!("[{:?}]: {}", c, m));

                if let Err(reason) = resp {
                    with_state_mut(|s| s.reset_archive_batch(req.tasks, reason, time()));
                }
            });
        }
    });
}

thread_local! {
    static TASKS_STATE: RefCell<TasksState> = RefCell::new(TasksState::new(Principal::management_canister()));
}

fn with_state<R, F: FnOnce(&TasksState) -> R>(f: F) -> R {
    TASKS_STATE.with(|s| {
        let state_ref = s.borrow();

        f(&state_ref)
    })
}

fn with_state_mut<R, F: FnOnce(&mut TasksState) -> R>(f: F) -> R {
    TASKS_STATE.with(|s| {
        let mut state_ref = s.borrow_mut();

        f(&mut state_ref)
    })
}

export_candid!();
