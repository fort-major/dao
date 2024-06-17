use std::collections::BTreeMap;

use candid::Principal;

use crate::TimestampNs;

use super::{
    api::{
        AttachToTaskRequest, AttachToTaskResponse, CreateTaskRequest, CreateTaskResponse,
        DeleteRequest, DeleteResponse, EditTaskRequest, EditTaskResponse, EvaluateRequest,
        EvaluateResponse, FinishEditTaskRequest, FinishEditTaskResponse, FinishSolveRequest,
        FinishSolveResponse, GetTaskIdsRequest, GetTaskIdsResponse, GetTasksRequest,
        GetTasksResponse, SolveTaskRequest, SolveTaskResponse,
    },
    types::{RewardEntry, Task, TaskId},
};

pub struct TasksState {
    pub task_id_generator: TaskId,
    pub tasks: BTreeMap<TaskId, Task>,
}

impl TasksState {
    pub fn new() -> Self {
        Self {
            task_id_generator: 0,
            tasks: BTreeMap::new(),
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
        );

        EditTaskResponse {}
    }

    pub fn finish_edit_task(&mut self, req: FinishEditTaskRequest) -> FinishEditTaskResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();
        task.finish_edit();

        FinishEditTaskResponse {}
    }

    pub fn attach_to_task(
        &mut self,
        req: AttachToTaskRequest,
        caller: Principal,
    ) -> AttachToTaskResponse {
        let task = self.tasks.get_mut(&req.id).unwrap();

        task.add_candidate(!req.detach, caller);

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

        GetTasksResponse { tasks }
    }

    fn generate_id(&mut self) -> TaskId {
        let id = self.task_id_generator;
        self.task_id_generator += 1;

        id
    }
}
