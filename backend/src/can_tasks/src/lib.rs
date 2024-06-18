use std::cell::RefCell;

use ic_cdk::{
    api::time,
    caller, export_candid, init, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    trap, update,
};
use shared::{
    humans::{api::MintRewardsRequest, client::HumansCanisterClient},
    tasks::{
        api::{
            AttachToTaskRequest, AttachToTaskResponse, CreateTaskRequest, CreateTaskResponse,
            DeleteRequest, DeleteResponse, EditTaskRequest, EditTaskResponse, EvaluateRequest,
            EvaluateResponse, FinishEditTaskRequest, FinishEditTaskResponse, FinishSolveRequest,
            FinishSolveResponse, GetTaskIdsRequest, GetTaskIdsResponse, GetTasksRequest,
            GetTasksResponse, SolveTaskRequest, SolveTaskResponse,
        },
        state::TasksState,
    },
    Guard, ENV_VARS,
};

#[init]
fn init_hook() {
    let tasks_state = create_tasks_state();

    install_tasks_state(Some(tasks_state));
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

        s.finish_edit_task(req, time())
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
    let (result, rewards) = with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to evaluate task");

        s.evaluate_task(req)
    });

    let humans_canister = HumansCanisterClient::new(ENV_VARS.humans_canister_id);
    let mint_rewards_req = MintRewardsRequest { rewards };

    // TODO: add rescheduling
    if let Err((code, msg)) = humans_canister.humans__mint_rewards(mint_rewards_req).await {
        trap(&format!(
            "FATAL!!! Unable to mint rewards: [{:?}] {}",
            code, msg
        ));
    }

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
fn tasks__get_task_ids(mut req: GetTaskIdsRequest) -> GetTaskIdsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get task ids");

        s.get_task_ids(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn tasks__get_tasks(mut req: GetTasksRequest) -> GetTasksResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get tasks");

        s.get_tasks(req)
    })
}

thread_local! {
    static TASKS_STATE: RefCell<Option<TasksState>> = RefCell::default();
}

pub fn create_tasks_state() -> TasksState {
    TasksState::new()
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
