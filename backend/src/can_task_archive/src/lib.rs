use std::cell::RefCell;

use ic_cdk::{
    api::time,
    caller, export_candid, init, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    update,
};
use shared::{
    task_archive::{
        api::{
            AppendBatchRequest, AppendBatchResponse, GetArchivedTasksByIdRequest,
            GetArchivedTasksByIdResponse, GetArchivedTasksRequest, GetArchivedTasksResponse,
            SetNextRequest, SetNextResponse,
        },
        state::TaskArchiveState,
    },
    Guard,
};

#[init]
fn init_hook() {
    let task_archive_state = create_task_archive_state();

    install_task_archive_state(Some(task_archive_state));
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    let task_archive_state = install_task_archive_state(None);

    stable_save((task_archive_state,)).expect("Unable to stable save");
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (task_archive_state,): (Option<TaskArchiveState>,) =
        stable_restore().expect("Unable to stable restore");

    install_task_archive_state(task_archive_state);
}

#[update]
#[allow(non_snake_case)]
fn task_archive__append_batch(mut req: AppendBatchRequest) -> AppendBatchResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to append batch");

        s.append_batch(req)
    })
}

#[update]
#[allow(non_snake_case)]
fn task_archive__set_next(mut req: SetNextRequest) -> SetNextResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to set next");

        s.set_next(req)
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
#[allow(non_snake_case)]
fn task_archive__get_archived_tasks(mut req: GetArchivedTasksRequest) -> GetArchivedTasksResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get archived tasks");

        s.get_archived_tasks(req)
    })
}

thread_local! {
    static TASK_ARCHIVE_STATE: RefCell<Option<TaskArchiveState>> = RefCell::default();
}

pub fn create_task_archive_state() -> TaskArchiveState {
    TaskArchiveState::default()
}

pub fn install_task_archive_state(new_state: Option<TaskArchiveState>) -> Option<TaskArchiveState> {
    TASK_ARCHIVE_STATE.replace(new_state)
}

fn with_state<R, F: FnOnce(&TaskArchiveState) -> R>(f: F) -> R {
    TASK_ARCHIVE_STATE.with(|s| {
        let state_ref = s.borrow();
        let state = state_ref
            .as_ref()
            .expect("Task archive state is not initialized");

        f(state)
    })
}

fn with_state_mut<R, F: FnOnce(&mut TaskArchiveState) -> R>(f: F) -> R {
    TASK_ARCHIVE_STATE.with(|s| {
        let mut state_ref = s.borrow_mut();
        let state = state_ref
            .as_mut()
            .expect("Task archive state is not initialized");

        f(state)
    })
}

export_candid!();
