use std::collections::{BTreeMap, BTreeSet};

use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;

use crate::{e8s::E8s, escape_script_tag, Guard, GuardContext};

use super::{
    state::TasksState,
    tasks::{SolutionField, SolverConstraint, Task, TaskId},
};

#[derive(CandidType, Deserialize, Validate)]
pub struct CreateTaskRequest {
    #[garde(length(graphemes, min = 1, max = 256))]
    pub title: String,
    #[garde(length(graphemes, min = 16, max = 4096))]
    pub description: String,
    #[garde(dive)]
    pub solution_fields: Vec<SolutionField>,
    #[garde(dive)]
    pub solver_constraints: Vec<SolverConstraint>,
    #[garde(skip)]
    pub hours_estimate: E8s,
    #[garde(skip)]
    pub storypoints_budget: E8s,
}

impl Guard<TasksState> for CreateTaskRequest {
    fn assert_valid_for(&self, state: &TasksState, ctx: &GuardContext) -> Result<(), String> {
        if !ctx.caller_is_team_member {
            return Err(format!("Only team members can create tasks"));
        }

        self.validate(&()).map_err(|e| e.to_string())
    }

    fn escape(&mut self, state: &TasksState) -> Result<(), String> {
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
    pub new_hours_estimate_opt: Option<E8s>,
    #[garde(skip)]
    pub new_storypoints_budget_opt: Option<E8s>,
}

impl Guard<TasksState> for EditTaskRequest {
    fn assert_valid_for(&self, state: &TasksState, ctx: &GuardContext) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if let Some(task) = state.tasks.get(&self.id) {
            if ctx.caller_is_voting_canister {
                return Ok(());
            }

            match (task.is_creator(&ctx.caller), task.can_edit()) {
                (true, true) => Ok(()),
                _ => Err(format!("Access denied")),
            }
        } else {
            Err(format!("Task {} not found", self.id))
        }
    }

    fn escape(&mut self, state: &TasksState) -> Result<(), String> {
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
    #[garde(skip)]
    pub final_storypoints_budget: E8s,
}

impl Guard<TasksState> for FinishEditTaskRequest {
    fn assert_valid_for(&self, state: &TasksState, ctx: &GuardContext) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if let Some(task) = state.tasks.get(&self.id) {
            match (task.can_edit(), ctx.caller_is_voting_canister) {
                (true, true) => Ok(()),
                _ => Err(format!("Access denied")),
            }
        } else {
            Err(format!("Task {} not found", self.id))
        }
    }

    fn escape(&mut self, state: &TasksState) -> Result<(), String> {
        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct FinishEditTaskResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct SolveTaskRequest {
    #[garde(skip)]
    pub id: TaskId,
    #[garde(inner(inner(inner(length(graphemes, max = 512)))))]
    pub filled_in_fields_opt: Option<Vec<Option<String>>>,
}

impl Guard<TasksState> for SolveTaskRequest {
    fn assert_valid_for(&self, state: &TasksState, ctx: &GuardContext) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if let Some(task) = state.tasks.get(&self.id) {
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

            match (
                task.can_solve(),
                ctx.caller_is_team_member,
                task.is_team_only(),
            ) {
                (true, true, true) => Ok(()),
                (true, _, false) => Ok(()),
                _ => Err(format!("Access denied")),
            }
        } else {
            Err(format!("Task {} not found", self.id))
        }
    }

    fn escape(&mut self, state: &TasksState) -> Result<(), String> {
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
    fn assert_valid_for(&self, state: &TasksState, ctx: &GuardContext) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if let Some(task) = state.tasks.get(&self.id) {
            if task.can_solve() && ctx.caller_is_voting_canister {
                Ok(())
            } else {
                Err(format!("Access denied"))
            }
        } else {
            Err(format!("Task {} not found", self.id))
        }
    }

    fn escape(&mut self, state: &TasksState) -> Result<(), String> {
        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct FinishSolveResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct EvaluateRequest {
    #[garde(skip)]
    pub id: TaskId,
    #[garde(skip)]
    pub evaluation_per_solution: Vec<(Principal, E8s)>,
}

impl Guard<TasksState> for EvaluateRequest {
    fn assert_valid_for(&self, state: &TasksState, ctx: &GuardContext) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if let Some(task) = state.tasks.get(&self.id) {
            if !(task.can_evaluate() && ctx.caller_is_voting_canister) {
                return Err(format!("Access denied"));
            }

            let evaluated_solutions: BTreeMap<Principal, E8s> =
                self.evaluation_per_solution.iter().cloned().collect();

            let one = E8s::one();

            for existing_solver in task.solutions.keys() {
                if let Some(evaluation) = evaluated_solutions.get(existing_solver) {
                    if evaluation > &one {
                        return Err(format!(
                            "Non-normalized solution found {} {}",
                            existing_solver, evaluation
                        ));
                    }
                } else {
                    return Err(format!(
                        "Not all solutions were evaluated! Missing {}",
                        existing_solver
                    ));
                }
            }

            Ok(())
        } else {
            Err(format!("Task {} not found", self.id))
        }
    }

    fn escape(&mut self, state: &TasksState) -> Result<(), String> {
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
    fn assert_valid_for(&self, state: &TasksState, ctx: &GuardContext) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }

    fn escape(&mut self, state: &TasksState) -> Result<(), String> {
        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetTasksResponse {
    #[garde(skip)]
    pub tasks: Vec<Option<Task>>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetTaskIdsRequest {}

impl Guard<TasksState> for GetTaskIdsRequest {
    fn assert_valid_for(&self, state: &TasksState, ctx: &GuardContext) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }

    fn escape(&mut self, state: &TasksState) -> Result<(), String> {
        Ok(())
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
    fn assert_valid_for(&self, state: &TasksState, ctx: &GuardContext) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if let Some(task) = state.tasks.get(&self.id) {
            if task.creator == ctx.caller && task.can_edit() {
                return Ok(());
            }

            if task.can_delete() && ctx.caller_is_voting_canister {
                return Ok(());
            }

            Err(format!("Access denied"))
        } else {
            Err(format!("Task {} not found", self.id))
        }
    }

    fn escape(&mut self, state: &TasksState) -> Result<(), String> {
        todo!()
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct DeleteResponse {}
