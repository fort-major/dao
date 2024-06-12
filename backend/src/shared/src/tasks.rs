use std::collections::{BTreeMap, BTreeSet};

use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;
use url::Url;

use crate::{e8s::E8s, TimestampNs};

pub type TaskId = u64;

#[derive(CandidType, Deserialize)]
pub struct Task {
    pub id: TaskId,
    pub title: String,
    pub description: String,
    pub created_at: TimestampNs,
    pub creator: Principal,
    pub stage: TaskStage,
    pub solution_fields: Vec<SolutionField>,
    pub solver_constraints: BTreeSet<SolverConstraint>,
    pub hours_estimate: E8s,
    pub storypoints_budget: E8s,
    pub candidates: BTreeSet<Principal>,
    pub solutions: BTreeMap<Principal, Solution>,
}

impl Task {
    pub fn new(
        id: TaskId,
        title: String,
        description: String,
        solution_fields: Vec<SolutionField>,
        solver_constraints: Vec<SolverConstraint>,
        hours_estimate: E8s,
        storypoints_budget: E8s,
        caller: Principal,
        now: TimestampNs,
    ) -> Self {
        Self {
            id,
            title,
            description,
            created_at: now,
            creator: caller,
            stage: TaskStage::Edit,
            solution_fields,
            solver_constraints: solver_constraints.into_iter().collect(),
            hours_estimate,
            storypoints_budget,
            candidates: BTreeSet::new(),
            solutions: BTreeMap::new(),
        }
    }

    pub fn edit(
        &mut self,
        new_title_opt: Option<String>,
        new_description_opt: Option<String>,
        new_solution_fields_opt: Option<Vec<SolutionField>>,
        new_solver_constraints_opt: Option<Vec<SolverConstraint>>,
        new_hours_estimate_opt: Option<E8s>,
        new_storypoints_budget_opt: Option<E8s>,
    ) {
        if let Some(new_title) = new_title_opt {
            self.title = new_title;
        }

        if let Some(new_description) = new_description_opt {
            self.description = new_description;
        }

        if let Some(new_solution_fields) = new_solution_fields_opt {
            self.solution_fields = new_solution_fields;
        }

        if let Some(new_solver_constraints) = new_solver_constraints_opt {
            self.solver_constraints = new_solver_constraints.into_iter().collect();
        }

        if let Some(new_hours_estimate) = new_hours_estimate_opt {
            self.hours_estimate = new_hours_estimate;
        }

        if let Some(new_storypoints_budget) = new_storypoints_budget_opt {
            self.storypoints_budget = new_storypoints_budget;
        }
    }

    pub fn finish_edit(&mut self) {
        self.stage = TaskStage::Solve;
    }

    pub fn solve(
        &mut self,
        filled_in_fields_opt: Option<Vec<Option<String>>>,
        caller: Principal,
        now: TimestampNs,
    ) -> Result<(), String> {
        if let Some(mut filled_in_fields) = filled_in_fields_opt {
            self.solutions
                .insert(caller, Solution::new(filled_in_fields, now));
        } else {
            self.solutions.remove(&caller);
        }

        Ok(())
    }

    pub fn finish_solve(&mut self) {
        self.stage = TaskStage::Evaluate;
    }

    // is called by the voting canister
    // expects normalized evaluation as input (0.0 ... 1.0 values)
    pub fn evaluate(
        &mut self,
        evaluation_per_solution: Vec<(Principal, E8s)>,
    ) -> Result<Vec<RewardEntry>, String> {
        let mut result = Vec::new();

        if self.storypoints_budget != E8s::zero() {
            let mut evaluation_sum = E8s::zero();
            let mut max_evaluation = E8s::zero();

            for (solver, eval) in evaluation_per_solution.iter() {
                if !self.solutions.contains_key(&solver) {
                    return Err(format!("Solver {} not found", solver));
                }

                if eval > &max_evaluation {
                    max_evaluation = eval.clone();
                }

                evaluation_sum += eval;
            }

            // the best result defines the budget spent
            let max_reward = &self.storypoints_budget * max_evaluation;
            let reward_base = max_reward / evaluation_sum;

            for (solver, evaluation) in evaluation_per_solution {
                let reward_storypoints = &reward_base * &evaluation;

                let entry = RewardEntry {
                    solver,
                    reward_storypoints,
                    reward_hours: self.hours_estimate.clone(),
                };

                let solution = self.solutions.get_mut(&entry.solver).unwrap();

                solution.evaluation = Some(evaluation);
                solution.reward_storypoints = Some(entry.reward_storypoints.clone());

                result.push(entry);
            }
        } else {
            for (solver, evaluation) in evaluation_per_solution {
                let entry = RewardEntry {
                    solver,
                    reward_storypoints: E8s::zero(),
                    reward_hours: self.hours_estimate.clone(),
                };

                let solution = self.solutions.get_mut(&entry.solver).unwrap();

                solution.evaluation = Some(evaluation);
                solution.reward_storypoints = Some(entry.reward_storypoints.clone());

                result.push(entry);
            }
        }

        self.stage = TaskStage::Archive;

        Ok(result)
    }

    pub fn add_candidate(&mut self, is_candidate: bool, caller: Principal) {
        if is_candidate {
            self.candidates.insert(caller);
        } else {
            self.candidates.remove(&caller);
        }
    }

    pub fn team_only(&self) -> bool {
        self.solver_constraints
            .contains(&SolverConstraint::TeamOnly)
    }

    pub fn can_edit(&self) -> bool {
        matches!(self.stage, TaskStage::Edit)
    }

    pub fn can_solve(&self) -> bool {
        matches!(self.stage, TaskStage::Solve)
    }

    pub fn can_evaluate(&self) -> bool {
        matches!(self.stage, TaskStage::Evaluate)
    }
}

#[derive(CandidType, Deserialize)]
pub enum TaskStage {
    Edit,
    Solve,
    Evaluate,
    Archive,
}

#[derive(CandidType, Deserialize)]
pub struct RewardEntry {
    pub solver: Principal,
    pub reward_hours: E8s,
    pub reward_storypoints: E8s,
}

#[derive(CandidType, Deserialize)]
pub struct Solution {
    pub fields: Vec<Option<String>>,
    pub attached_at: TimestampNs,
    pub evaluation: Option<E8s>,
    pub reward_storypoints: Option<E8s>,
}

impl Solution {
    pub fn new(fields: Vec<Option<String>>, now: TimestampNs) -> Self {
        Self {
            fields,
            attached_at: now,
            evaluation: None,
            reward_storypoints: None,
        }
    }
}

#[derive(CandidType, Deserialize, Validate, PartialEq, Eq, PartialOrd, Ord)]
pub enum SolverConstraint {
    TeamOnly,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct SolutionField {
    #[garde(length(graphemes, min = 1, max = 64))]
    pub name: String,
    #[garde(length(graphemes, max = 512))]
    pub description: String,
    #[garde(dive)]
    pub kind: SolutionFieldKind,
    #[garde(skip)]
    pub required: bool,
}

impl SolutionField {
    pub fn validate_field(&self, field: &mut Option<String>) -> Result<(), String> {
        if let Some(value) = field {
            match &self.kind {
                SolutionFieldKind::Md => {
                    *value = html_escape::encode_script(value).to_string();

                    Ok(())
                }
                SolutionFieldKind::Url { kind } => kind.validate(&value),
            }
        } else {
            if self.required {
                Err(format!("The field {} is required", self.name))
            } else {
                Ok(())
            }
        }
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub enum SolutionFieldKind {
    Md,
    Url {
        #[garde(dive)]
        kind: URLKind,
    },
}

#[derive(CandidType, Deserialize, Validate)]
pub enum URLKind {
    Any,
    Github,
    Figma,
    Notion,
    Twitter,
    DfinityForum,
    FortMajorSite,
}

impl URLKind {
    pub fn validate(&self, s: &str) -> Result<(), String> {
        let url = Url::parse(s).map_err(|e| e.to_string())?;

        if matches!(self, Self::Any) {
            return Ok(());
        }

        let domain = url.domain().ok_or(format!("Invalid domain name"))?;

        match self {
            Self::Any => Ok(()),
            Self::Github => {
                if domain.ends_with("github.com") {
                    Ok(())
                } else {
                    Err(format!("Not a Github url"))
                }
            }
            Self::Figma => {
                if domain.ends_with("figma.com") {
                    Ok(())
                } else {
                    Err(format!("Not a Figma url"))
                }
            }
            Self::Notion => {
                if domain.ends_with("notion.so") || domain.ends_with("notion.site") {
                    Ok(())
                } else {
                    Err(format!("Not a Notion url"))
                }
            }
            Self::Twitter => {
                if domain.ends_with("twitter.com") || domain.ends_with("x.com") {
                    Ok(())
                } else {
                    Err(format!("Not a Twitter url"))
                }
            }
            Self::DfinityForum => {
                if domain.ends_with("forum.dfinity.org") {
                    Ok(())
                } else {
                    Err(format!("Not a Dfinity Forum url"))
                }
            }
            Self::FortMajorSite => {
                if domain.ends_with("fort-major.org") {
                    Ok(())
                } else {
                    Err(format!("Not a Fort Major url"))
                }
            }
        }
    }
}
