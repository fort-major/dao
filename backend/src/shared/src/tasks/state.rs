use std::collections::{BTreeMap, LinkedList};

use candid::{CandidType, Principal};
use serde::Deserialize;

use crate::{
    pagination::PageResponse,
    task_archive::{
        api::{AppendBatchRequest, GetArchivedTasksRequest, GetArchivedTasksResponse},
        client::TaskArchiveCanisterClient,
    },
    TimestampNs,
};

use super::{
    api::{
        AttachToTaskRequest, AttachToTaskResponse, CreateTaskRequest, CreateTaskResponse,
        DeleteRequest, DeleteResponse, EditTaskRequest, EditTaskResponse, EvaluateRequest,
        EvaluateResponse, FinishEditTaskRequest, FinishEditTaskResponse, FinishSolveRequest,
        FinishSolveResponse, GetTaskIdsRequest, GetTaskIdsResponse, GetTasksRequest,
        GetTasksResponse, SolveTaskRequest, SolveTaskResponse,
    },
    types::{ArchivedTask, RewardEntry, Task, TaskId},
};

#[derive(CandidType, Deserialize)]
pub struct TasksState {
    pub task_id_generator: TaskId,
    pub tasks: BTreeMap<TaskId, Task>,
    pub archive: LinkedList<ArchivedTask>,
    pub task_archive_canister_id: Principal,
    pub last_archive_error: Option<(u64, String)>,
}

impl TasksState {
    pub fn new(task_archive_canister_id: Principal) -> Self {
        Self {
            task_id_generator: 0,
            tasks: BTreeMap::new(),
            archive: LinkedList::new(),
            task_archive_canister_id,
            last_archive_error: None,
        }
    }

    pub fn create_task(
        &mut self,
        req: CreateTaskRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> CreateTaskResponse {
        let id = self.generate_id();
        let task = Task::new(
            id,
            req.title,
            req.description,
            req.days_to_solve,
            req.solution_fields,
            req.solver_constraints,
            req.hours_base,
            req.storypoints_base,
            req.storypoints_ext_budget,
            caller,
            now,
        );

        self.tasks.insert(id, task);

        CreateTaskResponse { id }
    }

    pub fn edit_task(&mut self, req: EditTaskRequest) -> EditTaskResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();
        task.edit(
            req.new_title_opt,
            req.new_description_opt,
            req.new_solution_fields_opt,
            req.new_solver_constraints_opt,
            req.new_hours_base_opt,
            req.new_storypoints_base_opt,
            req.new_storypoints_ext_budget_opt,
            req.new_days_to_solve_opt,
        );

        EditTaskResponse {}
    }

    pub fn finish_edit_task(
        &mut self,
        req: FinishEditTaskRequest,
        now: TimestampNs,
    ) -> FinishEditTaskResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();
        task.finish_edit(now);

        FinishEditTaskResponse {}
    }

    pub fn attach_to_task(
        &mut self,
        req: AttachToTaskRequest,
        caller: Principal,
    ) -> AttachToTaskResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();

        task.add_solver(!req.detach, caller);

        AttachToTaskResponse {}
    }

    pub fn solve_task(
        &mut self,
        req: SolveTaskRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> SolveTaskResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();
        task.solve(req.filled_in_fields_opt, caller, now);

        SolveTaskResponse {}
    }

    pub fn finish_solve_task(&mut self, req: FinishSolveRequest) -> FinishSolveResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();
        task.finish_solve();

        FinishSolveResponse {}
    }

    pub fn evaluate_task(&mut self, req: EvaluateRequest) -> (EvaluateResponse, Vec<RewardEntry>) {
        let task = self.tasks.get_mut(&req.id).unwrap();
        let rewards = task.evaluate(req.evaluation_per_solution);

        (EvaluateResponse {}, rewards)
    }

    pub fn archive_task(&mut self, id: TaskId) {
        let task = self.tasks.remove(&id).unwrap().to_archived();

        self.archive.push_back(task);
    }

    pub fn delete_task(&mut self, req: DeleteRequest) -> DeleteResponse {
        self.tasks.remove(&req.id);

        DeleteResponse {}
    }

    pub fn get_task_ids(&self, _: GetTaskIdsRequest) -> GetTaskIdsResponse {
        let ids = self.tasks.keys().copied().collect();

        GetTaskIdsResponse { ids }
    }

    pub fn get_tasks(&self, req: GetTasksRequest) -> GetTasksResponse {
        let tasks = req
            .ids
            .iter()
            .map(|id| self.tasks.get(id).cloned())
            .collect();

        GetTasksResponse { entries: tasks }
    }

    pub fn prepare_archive_batch(
        &mut self,
    ) -> Option<(TaskArchiveCanisterClient, AppendBatchRequest)> {
        if self.archive.is_empty() {
            return None;
        }

        let mut tasks = Vec::new();

        for _ in 0..100 {
            if let Some(task) = self.archive.pop_front() {
                tasks.push(task);
            } else {
                break;
            }
        }

        let client = TaskArchiveCanisterClient::new(self.task_archive_canister_id);
        let req = AppendBatchRequest { tasks };

        Some((client, req))
    }

    pub fn reset_archive_batch(
        &mut self,
        batch: Vec<ArchivedTask>,
        reason: String,
        now: TimestampNs,
    ) {
        for task in batch.into_iter().rev() {
            self.archive.push_front(task);
        }

        self.last_archive_error = Some((now, reason));
    }

    pub fn get_archived_tasks(&self, req: GetArchivedTasksRequest) -> GetArchivedTasksResponse {
        let (entries, left): (Vec<_>, u32) = if req.pagination.reversed {
            let mut iter = self.archive.iter().rev().skip(req.pagination.skip as usize);

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
                .cloned()
                .collect();

            let left = iter.count() as u32;

            (entries, left)
        } else {
            let mut iter = self.archive.iter().skip(req.pagination.skip as usize);

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
                next: Some(self.task_archive_canister_id),
            },
        }
    }

    fn generate_id(&mut self) -> TaskId {
        let id = self.task_id_generator;
        self.task_id_generator += 1;

        id
    }
}
