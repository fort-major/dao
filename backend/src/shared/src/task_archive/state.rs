use candid::{CandidType, Principal};
use serde::Deserialize;
use std::collections::BTreeMap;

use crate::{
    pagination::PageResponse,
    tasks::types::{ArchivedTask, TaskId},
};

use super::api::{
    AppendBatchRequest, AppendBatchResponse, GetArchivedTasksByIdRequest,
    GetArchivedTasksByIdResponse, GetArchivedTasksRequest, GetArchivedTasksResponse,
    SetNextRequest, SetNextResponse,
};

#[derive(CandidType, Deserialize, Default)]
pub struct TaskArchiveState {
    pub next: Option<Principal>,
    pub tasks: BTreeMap<TaskId, ArchivedTask>,
}

impl TaskArchiveState {
    pub fn append_batch(&mut self, req: AppendBatchRequest) -> AppendBatchResponse {
        self.tasks.extend(req.tasks.into_iter().map(|it| {
            let id = match &it {
                ArchivedTask::V0001(t) => t.id,
            };

            (id, it)
        }));

        AppendBatchResponse {}
    }

    pub fn get_archived_tasks_by_id(
        &self,
        req: GetArchivedTasksByIdRequest,
    ) -> GetArchivedTasksByIdResponse {
        let entries = req
            .ids
            .into_iter()
            .map(|id| self.tasks.get(&id).cloned())
            .collect();

        GetArchivedTasksByIdResponse { entries }
    }

    pub fn get_archived_tasks(&self, req: GetArchivedTasksRequest) -> GetArchivedTasksResponse {
        let (entries, left): (Vec<_>, u32) = if req.pagination.reversed {
            let mut iter = self.tasks.iter().rev().skip(req.pagination.skip as usize);

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
                .map(|(_, it)| it)
                .cloned()
                .collect();

            let left = iter.count() as u32;

            (entries, left)
        } else {
            let mut iter = self.tasks.iter().skip(req.pagination.skip as usize);

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
                .map(|(_, it)| it)
                .cloned()
                .collect();

            let left = iter.count() as u32;

            (entries, left)
        };

        GetArchivedTasksResponse {
            entries,
            pagination: PageResponse {
                left,
                next: self.next,
            },
        }
    }

    pub fn set_next(&mut self, req: SetNextRequest) -> SetNextResponse {
        self.next = req.next;

        SetNextResponse {}
    }
}
