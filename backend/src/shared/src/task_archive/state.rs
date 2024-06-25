use std::collections::LinkedList;

use candid::{CandidType, Principal};
use serde::Deserialize;

use crate::{pagination::PageResponse, tasks::types::ArchivedTask};

use super::api::{
    AppendBatchRequest, AppendBatchResponse, GetArchivedTasksRequest, GetArchivedTasksResponse,
    SetNextRequest, SetNextResponse,
};

#[derive(CandidType, Deserialize, Default)]
pub struct TaskArchiveState {
    pub next: Option<Principal>,
    pub tasks: LinkedList<ArchivedTask>,
}

impl TaskArchiveState {
    pub fn append_batch(&mut self, req: AppendBatchRequest) -> AppendBatchResponse {
        self.tasks.extend(req.tasks.into_iter());

        AppendBatchResponse {}
    }

    pub fn get_archived_tasks(&self, req: GetArchivedTasksRequest) -> GetArchivedTasksResponse {
        let (entries, left): (Vec<_>, u32) = if req.pagination.reversed {
            let mut iter = self.tasks.iter().rev().skip(req.pagination.skip as usize);

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
                .cloned()
                .collect();

            let left = iter.count() as u32;

            (entries, left)
        } else {
            let mut iter = self.tasks.iter().skip(req.pagination.skip as usize);

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
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
