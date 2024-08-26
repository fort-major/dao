use std::collections::BTreeMap;

use candid::{CandidType, Principal};
use serde::Deserialize;

use crate::{
    pagination::PageResponse,
    task_archive::{
        api::{
            AppendBatchRequest, GetArchivedTaskIdsRequest, GetArchivedTaskIdsResponse,
            GetArchivedTasksByIdRequest, GetArchivedTasksByIdResponse,
        },
        client::TaskArchiveCanisterClient,
    },
    TimestampNs,
};

use super::{
    api::{
        AttachToTaskRequest, AttachToTaskResponse, BackToEditTaskRequest, BackToEditTaskResponse,
        CreateTaskRequest, CreateTaskResponse, DeleteRequest, DeleteResponse, EditTaskRequest,
        EditTaskResponse, EvaluateRequest, EvaluateResponse, FinishEditTaskRequest,
        FinishEditTaskResponse, FinishSolveRequest, FinishSolveResponse, GetTaskIdsRequest,
        GetTaskIdsResponse, GetTasksByIdRequest, GetTasksByIdResponse, GetTasksStatsRequest,
        GetTasksStatsResponse, SolveTaskRequest, SolveTaskResponse, StartSolveTaskRequest,
        StartSolveTaskResponse,
    },
    types::{ArchivedTask, RewardEntry, Task, TaskFilter, TaskId, TaskStage},
};

#[derive(CandidType, Deserialize)]
pub struct TasksState {
    pub task_id_generator: TaskId,
    pub tasks: BTreeMap<TaskId, Task>,
    pub archive: BTreeMap<TaskId, ArchivedTask>,
    pub task_archive_canister_id: Principal,
    pub last_archive_error: Option<(u64, String)>,
}

impl TasksState {
    pub fn new(task_archive_canister_id: Principal) -> Self {
        Self {
            task_id_generator: 0,
            tasks: BTreeMap::new(),
            archive: BTreeMap::new(),
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
        let id = self.generate_task_id();
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
            req.decision_topics.into_iter().collect(),
            req.assignees,
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
            req.new_decision_topics_opt,
            req.new_assignees_opt,
        );

        EditTaskResponse {}
    }

    pub fn finish_edit_task(&mut self, req: FinishEditTaskRequest) -> FinishEditTaskResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();
        task.finish_edit();

        FinishEditTaskResponse { task: task.clone() }
    }

    pub fn start_solve_task(
        &mut self,
        req: StartSolveTaskRequest,
        now: TimestampNs,
    ) -> StartSolveTaskResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();
        task.start_solve(now);

        StartSolveTaskResponse {}
    }

    pub fn back_to_edit_task(&mut self, req: BackToEditTaskRequest) -> BackToEditTaskResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();
        task.back_to_edit();

        BackToEditTaskResponse {}
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
        task.solve(req.filled_in_fields_opt, req.want_rep, caller, now);

        SolveTaskResponse {}
    }

    pub fn finish_solve_task(&mut self, req: FinishSolveRequest) -> FinishSolveResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();
        task.finish_solve();

        FinishSolveResponse { task: task.clone() }
    }

    pub fn evaluate_task(&mut self, req: EvaluateRequest) -> (EvaluateResponse, Vec<RewardEntry>) {
        let task = self.tasks.get_mut(&req.id).unwrap();
        let rewards = task.evaluate(req.evaluation_per_solution);

        (EvaluateResponse {}, rewards)
    }

    pub fn archive_task(&mut self, id: TaskId) {
        let task = self.tasks.remove(&id).unwrap().to_archived();

        self.archive.insert(id, task);
    }

    pub fn delete_task(&mut self, req: DeleteRequest) -> DeleteResponse {
        self.tasks.remove(&req.id);

        DeleteResponse {}
    }

    pub fn get_tasks_by_id(&self, req: GetTasksByIdRequest) -> GetTasksByIdResponse {
        let tasks = req
            .ids
            .iter()
            .map(|id| self.tasks.get(id).cloned())
            .collect();

        GetTasksByIdResponse { entries: tasks }
    }

    pub fn get_task_ids(&self, req: GetTaskIdsRequest) -> GetTaskIdsResponse {
        let (entries, left): (Vec<_>, u32) = if req.pagination.reversed {
            let mut iter = self
                .tasks
                .iter()
                .rev()
                .filter(|it| match req.filter {
                    TaskFilter::Stage(stage) => match stage {
                        TaskStage::Edit => matches!(it.1.stage, TaskStage::Edit),
                        TaskStage::PreSolve => matches!(it.1.stage, TaskStage::PreSolve),
                        TaskStage::Solve { until_timestamp: _ } => {
                            matches!(it.1.stage, TaskStage::Solve { until_timestamp: _ })
                        }
                        TaskStage::Evaluate => matches!(it.1.stage, TaskStage::Evaluate),
                    },
                })
                .skip(req.pagination.skip as usize);

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
                .map(|(id, _)| id)
                .copied()
                .collect();

            let left = iter.count() as u32;

            (entries, left)
        } else {
            let mut iter = self
                .tasks
                .iter()
                .filter(|it| match req.filter {
                    TaskFilter::Stage(stage) => match stage {
                        TaskStage::Edit => matches!(it.1.stage, TaskStage::Edit),
                        TaskStage::PreSolve => matches!(it.1.stage, TaskStage::PreSolve),
                        TaskStage::Solve { until_timestamp: _ } => {
                            matches!(it.1.stage, TaskStage::Solve { until_timestamp: _ })
                        }
                        TaskStage::Evaluate => matches!(it.1.stage, TaskStage::Evaluate),
                    },
                })
                .skip(req.pagination.skip as usize);

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
                .map(|(id, _)| id)
                .copied()
                .collect();

            let left = iter.count() as u32;

            (entries, left)
        };

        GetTaskIdsResponse {
            entries,
            pagination: PageResponse { left, next: None },
        }
    }

    pub fn prepare_task_archive_batch(
        &mut self,
    ) -> Option<(TaskArchiveCanisterClient, AppendBatchRequest)> {
        if self.archive.is_empty() {
            return None;
        }

        let mut ids_to_remove = vec![];
        let mut i = 0;

        for id in self.archive.keys() {
            ids_to_remove.push(*id);
            i += 1;

            if i == 50 {
                break;
            }
        }

        let mut tasks = Vec::new();
        for id in ids_to_remove {
            let task = self.archive.remove(&id).unwrap();
            tasks.push(task);
        }

        let client = TaskArchiveCanisterClient::new(self.task_archive_canister_id);
        let req = AppendBatchRequest { tasks };

        Some((client, req))
    }

    pub fn reset_task_archive_batch(
        &mut self,
        batch: Vec<ArchivedTask>,
        reason: String,
        now: TimestampNs,
    ) {
        for task in batch.into_iter() {
            match task {
                ArchivedTask::V0001(t) => {
                    self.archive.insert(t.id, ArchivedTask::V0001(t));
                }
            }
        }

        self.last_archive_error = Some((now, reason));
    }

    pub fn get_archived_task_ids(
        &self,
        req: GetArchivedTaskIdsRequest,
    ) -> GetArchivedTaskIdsResponse {
        let (entries, left): (Vec<_>, u32) = if req.pagination.reversed {
            let mut iter = self.archive.iter().rev().skip(req.pagination.skip as usize);

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
                .map(|(id, _)| id)
                .cloned()
                .collect();

            let left = iter.count() as u32;

            (entries, left)
        } else {
            let mut iter = self.archive.iter().skip(req.pagination.skip as usize);

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
                .map(|(id, _)| id)
                .cloned()
                .collect();

            let left = iter.count() as u32;

            (entries, left)
        };

        GetArchivedTaskIdsResponse {
            entries,
            pagination: PageResponse {
                left,
                next: Some(self.task_archive_canister_id),
            },
        }
    }

    pub fn get_archived_tasks_by_id(
        &self,
        req: GetArchivedTasksByIdRequest,
    ) -> GetArchivedTasksByIdResponse {
        let entries = req
            .ids
            .into_iter()
            .map(|id| self.archive.get(&id).cloned())
            .collect();

        GetArchivedTasksByIdResponse {
            entries,
            next: Some(self.task_archive_canister_id),
        }
    }

    pub fn get_task_stats(&self, _req: GetTasksStatsRequest) -> GetTasksStatsResponse {
        GetTasksStatsResponse {
            ready_to_solve_tasks: self
                .tasks
                .iter()
                .filter(|(_, it)| matches!(it.stage, TaskStage::Solve { until_timestamp: _ }))
                .count() as u32,
            solved_tasks: self.archive.len() as u32,
            next: self.task_archive_canister_id,
        }
    }

    fn generate_task_id(&mut self) -> TaskId {
        let id = self.task_id_generator;
        self.task_id_generator += 1;

        id
    }
}
