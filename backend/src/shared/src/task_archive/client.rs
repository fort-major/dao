use candid::Principal;
use ic_cdk::{api::call::CallResult, call};

use super::api::{
    AppendBatchRequest, AppendBatchResponse, GetArchivedTaskIdsRequest, GetArchivedTaskIdsResponse,
    GetArchivedTasksByIdRequest, GetArchivedTasksByIdResponse, SetNextRequest, SetNextResponse,
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
    pub async fn task_archive__get_archived_tasks_by_id(
        &self,
        req: GetArchivedTasksByIdRequest,
    ) -> CallResult<GetArchivedTasksByIdResponse> {
        call(
            self.canister_id,
            "task_archive__get_archived_tasks_by_id",
            (req,),
        )
        .await
        .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn task_archive__get_archived_task_ids(
        &self,
        req: GetArchivedTaskIdsRequest,
    ) -> CallResult<GetArchivedTaskIdsResponse> {
        call(
            self.canister_id,
            "task_archive__get_archived_task_ids",
            (req,),
        )
        .await
        .map(|(it,)| it)
    }
}
