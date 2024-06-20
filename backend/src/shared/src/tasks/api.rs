use std::collections::BTreeMap;

use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;

use crate::{e8s::E8s, escape_script_tag, proof::Proof, Guard, ENV_VARS};

use super::{
    state::TasksState,
    types::{ArchivedTask, SolutionField, SolverConstraint, Task, TaskId, TaskStage},
};

#[derive(CandidType, Deserialize, Validate)]
pub struct CreateTaskRequest {
    #[garde(length(graphemes, min = 1, max = 256))]
    pub title: String,
    #[garde(length(graphemes, min = 16, max = 4096))]
    pub description: String,
    #[garde(range(max = 90))]
    pub days_to_solve: u64,
    #[garde(dive)]
    pub solution_fields: Vec<SolutionField>,
    #[garde(dive)]
    pub solver_constraints: Vec<SolverConstraint>,
    #[garde(skip)]
    pub hours_base: E8s,
    #[garde(skip)]
    pub storypoints_base: E8s,
    #[garde(skip)]
    pub storypoints_ext_budget: E8s,
    #[garde(dive)]
    pub team_proof: Proof,
}

impl Guard<TasksState> for CreateTaskRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TasksState,
        caller: Principal,
        now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;
        self.team_proof.assert_valid_for(caller, now)?;

        if !self
            .team_proof
            .profile_proof
            .as_ref()
            .expect("UNREACHEABLE")
            .is_team_member
        {
            return Err(format!("Only team members can create tasks"));
        }

        self.title = escape_script_tag(&self.title);
        self.description = escape_script_tag(&self.description);

        for field in self.solution_fields.iter_mut() {
            field.name = escape_script_tag(&field.name);
            field.description = escape_script_tag(&field.description);
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct CreateTaskResponse {
    #[garde(skip)]
    pub id: TaskId,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct EditTaskRequest {
    #[garde(skip)]
    pub id: TaskId,
    #[garde(inner(length(graphemes, min = 1, max = 256)))]
    pub new_title_opt: Option<String>,
    #[garde(inner(length(graphemes, min = 16, max = 4096)))]
    pub new_description_opt: Option<String>,
    #[garde(dive)]
    pub new_solution_fields_opt: Option<Vec<SolutionField>>,
    #[garde(dive)]
    pub new_solver_constraints_opt: Option<Vec<SolverConstraint>>,
    #[garde(skip)]
    pub new_hours_base_opt: Option<E8s>,
    #[garde(skip)]
    pub new_storypoints_base_opt: Option<E8s>,
    #[garde(skip)]
    pub new_storypoints_ext_budget_opt: Option<E8s>,
}

impl Guard<TasksState> for EditTaskRequest {
    fn validate_and_escape(
        &mut self,
        state: &TasksState,
        caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        let task = state
            .tasks
            .get(&self.id)
            .ok_or(format!("Task {} not found", self.id))?;

        match (
            caller == ENV_VARS.votings_canister_id,
            task.can_edit(),
            task.is_creator(&caller),
        ) {
            (true, _, _) => {}
            (false, true, true) => {}
            _ => return Err(format!("Access denied")),
        };

        if let Some(new_title) = &mut self.new_title_opt {
            *new_title = escape_script_tag(&new_title);
        }

        if let Some(new_description) = &mut self.new_description_opt {
            *new_description = escape_script_tag(&new_description);
        }

        if let Some(new_solution_fields) = &mut self.new_solution_fields_opt {
            for field in new_solution_fields.iter_mut() {
                field.name = escape_script_tag(&field.name);
                field.description = escape_script_tag(&field.description);
            }
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct EditTaskResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct FinishEditTaskRequest {
    #[garde(skip)]
    pub id: TaskId,
}

impl Guard<TasksState> for FinishEditTaskRequest {
    fn validate_and_escape(
        &mut self,
        state: &TasksState,
        caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        let task = state
            .tasks
            .get(&self.id)
            .ok_or(format!("Task {} not found", self.id))?;

        match (task.can_edit(), caller == ENV_VARS.votings_canister_id) {
            (true, true) => Ok(()),
            _ => Err(format!("Access denied")),
        }
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct FinishEditTaskResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct AttachToTaskRequest {
    #[garde(skip)]
    pub id: TaskId,
    #[garde(skip)]
    pub detach: bool,
}

impl Guard<TasksState> for AttachToTaskRequest {
    fn validate_and_escape(
        &mut self,
        state: &TasksState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        let task = state
            .tasks
            .get(&self.id)
            .ok_or(format!("Task {} not found", self.id))?;

        if !task.can_attach() {
            return Err(format!("Access denied"));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct AttachToTaskResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct SolveTaskRequest {
    #[garde(skip)]
    pub id: TaskId,
    #[garde(inner(inner(inner(length(graphemes, max = 512)))))]
    pub filled_in_fields_opt: Option<Vec<Option<String>>>,
    #[garde(dive)]
    pub team_proof: Option<Proof>,
}

impl Guard<TasksState> for SolveTaskRequest {
    fn validate_and_escape(
        &mut self,
        state: &TasksState,
        caller: Principal,
        now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        let task = state
            .tasks
            .get(&self.id)
            .ok_or(format!("Task {} not found", self.id))?;

        if !task.can_solve() {
            return Err(format!("Access denied"));
        }

        if task.is_team_only() {
            let proof = self.team_proof.as_mut().ok_or("No team proof provided")?;

            proof.assert_valid_for(caller, now)?;

            if !proof
                .profile_proof
                .as_ref()
                .expect("UNREACHEABLE")
                .is_team_member
            {
                return Err(format!("Only team members can solve this task"));
            }
        }

        if let Some(filled_in_fields) = &self.filled_in_fields_opt {
            if task.solution_fields.len() != filled_in_fields.len() {
                return Err(format!(
                    "Invalid number of fields, expected {}, received {}",
                    task.solution_fields.len(),
                    filled_in_fields.len()
                ));
            }

            for (idx, provided_field) in filled_in_fields.iter().enumerate() {
                task.solution_fields[idx].validate_field(provided_field)?;
            }
        }

        if let Some(filled_in_fields) = &mut self.filled_in_fields_opt {
            for field_opt in filled_in_fields.iter_mut() {
                if let Some(field) = field_opt {
                    *field = escape_script_tag(&field);
                }
            }
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct SolveTaskResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct FinishSolveRequest {
    #[garde(skip)]
    pub id: TaskId,
}

impl Guard<TasksState> for FinishSolveRequest {
    fn validate_and_escape(
        &mut self,
        state: &TasksState,
        _caller: Principal,
        now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        let task = state
            .tasks
            .get(&self.id)
            .ok_or(format!("Task {} not found", self.id))?;

        match task.stage {
            TaskStage::Solve { until_timestamp } => {
                if until_timestamp > now {
                    Err(format!("Unable to finish solve faster than planned"))
                } else {
                    Ok(())
                }
            }
            _ => Err(format!("Access denied")),
        }
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct FinishSolveResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct EvaluateRequest {
    #[garde(skip)]
    pub id: TaskId,
    #[garde(skip)]
    pub evaluation_per_solution: Vec<(Principal, Option<E8s>)>,
}

impl Guard<TasksState> for EvaluateRequest {
    fn validate_and_escape(
        &mut self,
        state: &TasksState,
        caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        let task = state
            .tasks
            .get(&self.id)
            .ok_or(format!("Task {} not found", self.id))?;

        if !(task.can_evaluate() && caller == ENV_VARS.votings_canister_id) {
            return Err(format!("Access denied"));
        }

        let evaluated_solutions: BTreeMap<Principal, Option<E8s>> =
            self.evaluation_per_solution.iter().cloned().collect();

        let one = E8s::one();

        for existing_solver in task.solutions.keys() {
            if let Some(evaluation_opt) = evaluated_solutions.get(existing_solver) {
                if let Some(evaluation) = evaluation_opt {
                    if evaluation > &one {
                        return Err(format!(
                            "Non-normalized evaluation found {} {}",
                            existing_solver, evaluation
                        ));
                    }
                }
            } else {
                return Err(format!(
                    "Not all solutions were evaluated! Missing {}",
                    existing_solver
                ));
            }
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct EvaluateResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetTasksRequest {
    #[garde(length(min = 1, max = 100))]
    pub ids: Vec<TaskId>,
}

impl Guard<TasksState> for GetTasksRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TasksState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetTasksResponse {
    #[garde(skip)]
    pub tasks: Vec<Option<Task>>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetArchivedTasksRequest {
    #[garde(length(min = 1, max = 100))]
    pub ids: Vec<TaskId>,
}

impl Guard<TasksState> for GetArchivedTasksRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TasksState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetArchivedTasksResponse {
    #[garde(skip)]
    pub tasks: Vec<Option<ArchivedTask>>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetTaskIdsRequest {}

impl Guard<TasksState> for GetTaskIdsRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TasksState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetTaskIdsResponse {
    #[garde(skip)]
    pub ids: Vec<TaskId>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct DeleteRequest {
    #[garde(skip)]
    pub id: TaskId,
}

impl Guard<TasksState> for DeleteRequest {
    fn validate_and_escape(
        &mut self,
        state: &TasksState,
        caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        let task = state
            .tasks
            .get(&self.id)
            .ok_or(format!("Task {} not found", self.id))?;

        if task.creator == caller && task.can_edit() {
            return Ok(());
        }

        if task.can_delete() && caller == ENV_VARS.votings_canister_id {
            return Ok(());
        }

        Err(format!("Access denied"))
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct DeleteResponse {}
