use std::cell::RefCell;

use ic_cdk::{
    api::time,
    caller, export_candid, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    update,
};
use shared::{
    task_archive::{
        api::{
            AppendBatchRequest, AppendBatchResponse, GetArchivedTaskIdsRequest,
            GetArchivedTaskIdsResponse, GetArchivedTasksByIdRequest, GetArchivedTasksByIdResponse,
            GetArchivedTasksStatsRequest, GetArchivedTasksStatsResponse, SetNextRequest,
            SetNextResponse,
        },
        state::TaskArchiveState,
    },
    Guard,
};

#[pre_upgrade]
fn pre_upgrade_hook() {
    with_state(|s| stable_save((s,)).expect("Unable to stable save"));
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (task_archive_state,): (TaskArchiveState,) =
        stable_restore().expect("Unable to stable restore");

    with_state_mut(|s| *s = task_archive_state);
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
fn task_archive__get_archived_tasks(
    mut req: GetArchivedTaskIdsRequest,
) -> GetArchivedTaskIdsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get archived tasks");

        s.get_archived_tasks(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn task_archive__get_archived_tasks_stats(
    mut req: GetArchivedTasksStatsRequest,
) -> GetArchivedTasksStatsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get archived tasks stats");

        s.get_archived_tasks_stats(req)
    })
}

thread_local! {
    static TASK_ARCHIVE_STATE: RefCell<TaskArchiveState> = RefCell::default();
}

fn with_state<R, F: FnOnce(&TaskArchiveState) -> R>(f: F) -> R {
    TASK_ARCHIVE_STATE.with(|s| {
        let state_ref = s.borrow();

        f(&state_ref)
    })
}

fn with_state_mut<R, F: FnOnce(&mut TaskArchiveState) -> R>(f: F) -> R {
    TASK_ARCHIVE_STATE.with(|s| {
        let mut state_ref = s.borrow_mut();

        f(&mut state_ref)
    })
}

export_candid!();
