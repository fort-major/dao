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
    reputation::{api::MintRepRequest, client::ReputationCanisterClient},
    task_archive::api::{GetArchivedTaskIdsRequest, GetArchivedTaskIdsResponse},
    tasks::{
        api::{
            AttachToTaskRequest, AttachToTaskResponse, BackToEditTaskRequest,
            BackToEditTaskResponse, CreateTaskRequest, CreateTaskResponse, DeleteRequest,
            DeleteResponse, EditTaskRequest, EditTaskResponse, EvaluateRequest, EvaluateResponse,
            FinishEditTaskRequest, FinishEditTaskResponse, FinishSolveRequest, FinishSolveResponse,
            GetTasksByIdRequest, GetTasksByIdResponse, GetTaskIdsRequest, GetTaskIdsResponse,
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
    let tasks_state = create_tasks_state(req.task_archive_canister_id);

    install_tasks_state(Some(tasks_state));
    start_archiving_timer();
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    let tasks_state = install_tasks_state(None);

    stable_save((tasks_state,)).expect("Unable to stable save");
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (tasks_state,): (Option<TasksState>,) = stable_restore().expect("Unable to stable restore");

    install_tasks_state(tasks_state);
    start_archiving_timer();
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

    // TODO: add rescheduling
    if let Err((code, msg)) = humans_canister.humans__mint_rewards(mint_rewards_req).await {
        trap(&format!(
            "FATAL!!! Unable to mint rewards: [{:?}] {}",
            code, msg
        ));
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
            .expect("Unable to get tasks");

        s.get_archived_task_ids(req)
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
    static TASKS_STATE: RefCell<Option<TasksState>> = RefCell::default();
}

pub fn create_tasks_state(task_archive_canister_id: Principal) -> TasksState {
    TasksState::new(task_archive_canister_id)
}

pub fn install_tasks_state(new_state: Option<TasksState>) -> Option<TasksState> {
    TASKS_STATE.replace(new_state)
}

fn with_state<R, F: FnOnce(&TasksState) -> R>(f: F) -> R {
    TASKS_STATE.with(|s| {
        let state_ref = s.borrow();
        let state = state_ref.as_ref().expect("Tasks state is not initialized");

        f(state)
    })
}

fn with_state_mut<R, F: FnOnce(&mut TasksState) -> R>(f: F) -> R {
    TASKS_STATE.with(|s| {
        let mut state_ref = s.borrow_mut();
        let state = state_ref.as_mut().expect("Tasks state is not initialized");

        f(state)
    })
}

export_candid!();
