use candid::Principal;
use ic_cdk::{api::call::CallResult, call};

use super::api::{
    AppendBatchRequest, AppendBatchResponse, GetArchivedTasksRequest, GetArchivedTasksResponse,
    SetNextRequest, SetNextResponse,
};

pub struct TaskArchiveCanisterClient {
    pub canister_id: Principal,
}

impl TaskArchiveCanisterClient {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    #[allow(non_snake_case)]
    pub async fn task_archive__append_batch(
        &self,
        req: &AppendBatchRequest,
    ) -> CallResult<AppendBatchResponse> {
        call(self.canister_id, "task_archive__append_batch", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn task_archive__set_next(&self, req: SetNextRequest) -> CallResult<SetNextResponse> {
        call(self.canister_id, "task_archive__set_next", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn task_archive__get_archived_tasks(
        &self,
        req: GetArchivedTasksRequest,
    ) -> CallResult<GetArchivedTasksResponse> {
        call(self.canister_id, "task_archive__get_archived_tasks", (req,))
            .await
            .map(|(it,)| it)
    }
}
