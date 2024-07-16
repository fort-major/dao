use candid::Principal;
use ic_cdk::{api::call::CallResult, call};

use crate::task_archive::api::{GetArchivedTaskIdsRequest, GetArchivedTaskIdsResponse};

use super::api::{
    AttachToTaskRequest, AttachToTaskResponse, BackToEditTaskRequest, BackToEditTaskResponse,
    CreateTaskRequest, CreateTaskResponse, DeleteRequest, DeleteResponse, EditTaskRequest,
    EditTaskResponse, EvaluateRequest, EvaluateResponse, FinishEditTaskRequest,
    FinishEditTaskResponse, FinishSolveRequest, FinishSolveResponse, GetTasksByIdRequest,
    GetTasksByIdResponse, SolveTaskRequest, SolveTaskResponse, StartSolveTaskRequest,
    StartSolveTaskResponse,
};

pub struct TasksCanisterClient {
    pub canister_id: Principal,
}

impl TasksCanisterClient {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    #[allow(non_snake_case)]
    pub async fn tasks__create_task(
        &self,
        req: CreateTaskRequest,
    ) -> CallResult<CreateTaskResponse> {
        call(self.canister_id, "tasks__create_task", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__edit_task(&self, req: EditTaskRequest) -> CallResult<EditTaskResponse> {
        call(self.canister_id, "tasks__edit_task", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__finish_edit_task(
        &self,
        req: FinishEditTaskRequest,
    ) -> CallResult<FinishEditTaskResponse> {
        call(self.canister_id, "tasks__finish_edit_task", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__start_solve_task(
        &self,
        req: StartSolveTaskRequest,
    ) -> CallResult<StartSolveTaskResponse> {
        call(self.canister_id, "tasks__start_solve_task", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__back_to_edit_task(
        &self,
        req: BackToEditTaskRequest,
    ) -> CallResult<BackToEditTaskResponse> {
        call(self.canister_id, "tasks__back_to_edit_task", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__solve_task(&self, req: SolveTaskRequest) -> CallResult<SolveTaskResponse> {
        call(self.canister_id, "tasks__solve_task", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__attach_to_task(
        &self,
        req: AttachToTaskRequest,
    ) -> CallResult<AttachToTaskResponse> {
        call(self.canister_id, "tasks__attach_to_task", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__finish_solve_task(
        &self,
        req: FinishSolveRequest,
    ) -> CallResult<FinishSolveResponse> {
        call(self.canister_id, "tasks__finish_solve_task", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__evaluate_task(&self, req: EvaluateRequest) -> CallResult<EvaluateResponse> {
        call(self.canister_id, "tasks__evaluate_task", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__delete_task(&self, req: DeleteRequest) -> CallResult<DeleteResponse> {
        call(self.canister_id, "tasks__delete_task", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__get_tasks_by_id(
        &self,
        req: GetTasksByIdRequest,
    ) -> CallResult<GetTasksByIdResponse> {
        call(self.canister_id, "tasks__get_tasks_by_id", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn tasks__get_archived_task_ids(
        &self,
        req: GetArchivedTaskIdsRequest,
    ) -> CallResult<GetArchivedTaskIdsResponse> {
        call(self.canister_id, "tasks__get_archived_task_ids", (req,))
            .await
            .map(|(it,)| it)
    }
}
