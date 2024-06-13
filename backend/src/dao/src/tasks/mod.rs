use std::cell::RefCell;

use ic_cdk::{api::time, caller, query, spawn, update};
use shared::{
    tasks::{
        api::{
            CreateTaskRequest, CreateTaskResponse, DeleteRequest, DeleteResponse, EditTaskRequest,
            EditTaskResponse, EvaluateRequest, EvaluateResponse, FinishEditTaskRequest,
            FinishEditTaskResponse, FinishSolveRequest, FinishSolveResponse, GetTaskIdsRequest,
            GetTaskIdsResponse, GetTasksRequest, GetTasksResponse, SolveTaskRequest,
            SolveTaskResponse,
        },
        state::TasksState,
    },
    Guard,
};

use crate::interaction::{create_guard_context, mint_rewards};

thread_local! {
    static TASKS_STATE: RefCell<Option<TasksState>> = RefCell::default();
}

pub fn create_tasks_state() -> TasksState {
    TasksState::new()
}

pub fn install_tasks_state(new_state: Option<TasksState>) -> Option<TasksState> {
    TASKS_STATE.replace(new_state)
}

#[update]
#[allow(non_snake_case)]
async fn tasks__create_task(mut req: CreateTaskRequest) -> CreateTaskResponse {
    let ctx = create_guard_context().await;

    with_state_mut(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to create task");

        s.create_task(req, caller(), time())
    })
}

#[update]
#[allow(non_snake_case)]
async fn tasks__edit_task(mut req: EditTaskRequest) -> EditTaskResponse {
    let ctx = create_guard_context().await;

    with_state_mut(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to edit task");

        s.edit_task(req)
    })
}

#[update]
#[allow(non_snake_case)]
async fn tasks__finish_edit_task(mut req: FinishEditTaskRequest) -> FinishEditTaskResponse {
    let ctx = create_guard_context().await;

    with_state_mut(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to finish editing task");

        s.finish_edit_task(req)
    })
}

#[update]
#[allow(non_snake_case)]
async fn tasks__solve_task(mut req: SolveTaskRequest) -> SolveTaskResponse {
    let ctx = create_guard_context().await;

    with_state_mut(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to solve task");

        s.solve_task(req, caller(), time())
    })
}

#[update]
#[allow(non_snake_case)]
async fn tasks__finish_solve_task(mut req: FinishSolveRequest) -> FinishSolveResponse {
    let ctx = create_guard_context().await;

    with_state_mut(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to finish solving task");

        s.finish_solve_task(req)
    })
}

#[update]
#[allow(non_snake_case)]
async fn tasks__evaluate_task(mut req: EvaluateRequest) -> EvaluateResponse {
    let ctx = create_guard_context().await;

    let (result, rewards) = with_state_mut(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to evaluate task");

        s.evaluate_task(req)
    });

    spawn(mint_rewards(rewards));

    result
}

#[update]
#[allow(non_snake_case)]
async fn tasks__delete_task(mut req: DeleteRequest) -> DeleteResponse {
    let ctx = create_guard_context().await;

    with_state_mut(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to delete task");

        s.delete_task(req)
    })
}

#[query]
#[allow(non_snake_case)]
async fn tasks__get_task_ids(mut req: GetTaskIdsRequest) -> GetTaskIdsResponse {
    let ctx = create_guard_context().await;

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to get task ids");

        s.get_task_ids(req)
    })
}

#[query]
#[allow(non_snake_case)]
async fn tasks__get_tasks(mut req: GetTasksRequest) -> GetTasksResponse {
    let ctx = create_guard_context().await;

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to get tasks");

        s.get_tasks(req)
    })
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
