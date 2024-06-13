use std::collections::BTreeMap;

use candid::Principal;

use crate::{Guard, TimestampNs};

use super::{
    api::{
        CreateTaskRequest, CreateTaskResponse, DeleteRequest, DeleteResponse, EditTaskRequest,
        EditTaskResponse, EvaluateRequest, EvaluateResponse, FinishEditTaskRequest,
        FinishEditTaskResponse, FinishSolveRequest, FinishSolveResponse, GetTaskIdsRequest,
        GetTaskIdsResponse, GetTasksRequest, GetTasksResponse, SolveTaskRequest, SolveTaskResponse,
    },
    tasks::{Task, TaskId},
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
        mut req: CreateTaskRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> Result<CreateTaskResponse, String> {
        req.escape(&self)?;

        let id = self.generate_id();
        let task = Task::new(
            id,
            req.title,
            req.description,
            req.solution_fields,
            req.solver_constraints,
            req.hours_estimate,
            req.storypoints_budget,
            caller,
            now,
        );

        self.tasks.insert(id, task);

        Ok(CreateTaskResponse { id })
    }

    pub fn edit_task(&mut self, mut req: EditTaskRequest) -> Result<EditTaskResponse, String> {
        req.escape(&self)?;

        let task = self.tasks.get_mut(&req.id).unwrap();
        task.edit(
            req.new_title_opt,
            req.new_description_opt,
            req.new_solution_fields_opt,
            req.new_solver_constraints_opt,
            req.new_hours_estimate_opt,
            req.new_storypoints_budget_opt,
        );

        Ok(EditTaskResponse {})
    }

    pub fn finish_edit_task(
        &mut self,
        mut req: FinishEditTaskRequest,
    ) -> Result<FinishEditTaskResponse, String> {
        req.escape(&self)?;

        let task = self.tasks.get_mut(&req.id).unwrap();
        task.finish_edit(req.final_storypoints_budget);

        Ok(FinishEditTaskResponse {})
    }

    pub fn solve_task(
        &mut self,
        mut req: SolveTaskRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> Result<SolveTaskResponse, String> {
        req.escape(&self)?;

        let task = self.tasks.get_mut(&req.id).unwrap();
        task.solve(req.filled_in_fields_opt, caller, now)?;

        Ok(SolveTaskResponse {})
    }

    pub fn finish_solve_task(
        &mut self,
        mut req: FinishSolveRequest,
    ) -> Result<FinishSolveResponse, String> {
        req.escape(&self)?;

        let task = self.tasks.get_mut(&req.id).unwrap();
        task.finish_solve();

        Ok(FinishSolveResponse {})
    }

    pub fn evaluate_task(&mut self, mut req: EvaluateRequest) -> Result<EvaluateResponse, String> {
        req.escape(&self)?;

        let task = self.tasks.get_mut(&req.id).unwrap();
        task.evaluate(req.evaluation_per_solution);

        Ok(EvaluateResponse {})
    }

    pub fn get_tasks(&self, mut req: GetTasksRequest) -> Result<GetTasksResponse, String> {
        req.escape(&self)?;

        let tasks = req
            .ids
            .iter()
            .map(|id| self.tasks.get(id).cloned())
            .collect();

        Ok(GetTasksResponse { tasks })
    }

    pub fn get_task_ids(&self, mut req: GetTaskIdsRequest) -> Result<GetTaskIdsResponse, String> {
        req.escape(&self)?;

        let ids = self.tasks.keys().copied().collect();

        Ok(GetTaskIdsResponse { ids })
    }

    pub fn delete_task(&mut self, mut req: DeleteRequest) -> Result<DeleteResponse, String> {
        req.escape(&self)?;

        self.tasks.remove(&req.id);

        Ok(DeleteResponse {})
    }

    fn generate_id(&mut self) -> TaskId {
        let id = self.task_id_generator;
        self.task_id_generator += 1;

        id
    }
}
