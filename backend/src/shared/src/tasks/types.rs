use std::collections::{BTreeMap, BTreeSet};

use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;
use url::Url;

use crate::{e8s::E8s, votings::types::ONE_DAY_NS, TimestampNs};

pub type TaskId = u64;

#[derive(CandidType, Deserialize, Clone)]
pub struct Task {
    pub id: TaskId,
    pub title: String,
    pub description: String,
    pub created_at: TimestampNs,
    pub days_to_solve: u64,
    pub creator: Principal,
    pub stage: TaskStage,
    pub solution_fields: Vec<SolutionField>,
    pub solver_constraints: BTreeSet<SolverConstraint>,
    pub hours_base: E8s,
    pub storypoints_base: E8s,
    pub storypoints_ext_budget: E8s,
    pub solvers: BTreeSet<Principal>,
    pub solutions: BTreeMap<Principal, Solution>,
}

impl Task {
    pub fn new(
        id: TaskId,
        title: String,
        description: String,
        days_to_solve: u64,
        solution_fields: Vec<SolutionField>,
        solver_constraints: Vec<SolverConstraint>,
        hours_base: E8s,
        storypoints_base: E8s,
        storypoints_ext_budget: E8s,
        caller: Principal,
        now: TimestampNs,
    ) -> Self {
        Self {
            id,
            title,
            description,
            created_at: now,
            days_to_solve,
            creator: caller,
            stage: TaskStage::Edit,
            solution_fields,
            solver_constraints: solver_constraints.into_iter().collect(),
            hours_base,
            storypoints_base,
            storypoints_ext_budget,
            solvers: BTreeSet::new(),
            solutions: BTreeMap::new(),
        }
    }

    pub fn edit(
        &mut self,
        new_title_opt: Option<String>,
        new_description_opt: Option<String>,
        new_solution_fields_opt: Option<Vec<SolutionField>>,
        new_solver_constraints_opt: Option<Vec<SolverConstraint>>,
        new_hours_base_opt: Option<E8s>,
        new_storypoints_base_opt: Option<E8s>,
        new_storypoints_ext_budget_opt: Option<E8s>,
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

        if let Some(new_hours_base) = new_hours_base_opt {
            self.hours_base = new_hours_base;
        }

        if let Some(new_storypoints_base) = new_storypoints_base_opt {
            self.storypoints_base = new_storypoints_base;
        }

        if let Some(new_storypoints_ext_budget) = new_storypoints_ext_budget_opt {
            self.storypoints_ext_budget = new_storypoints_ext_budget;
        }
    }

    pub fn finish_edit(&mut self, now: TimestampNs) {
        let until_timestamp = now + ONE_DAY_NS * self.days_to_solve;

        self.stage = TaskStage::Solve { until_timestamp };
    }

    pub fn solve(
        &mut self,
        filled_in_fields_opt: Option<Vec<Option<String>>>,
        caller: Principal,
        now: TimestampNs,
    ) {
        if let Some(filled_in_fields) = filled_in_fields_opt {
            self.solutions
                .insert(caller, Solution::new(filled_in_fields, now));
        } else {
            self.solutions.remove(&caller);
        }
    }

    pub fn finish_solve(&mut self) {
        self.stage = TaskStage::Evaluate;
    }

    // makes the task stage Archive and calculates rewards based on the evaluation and the budget
    // called by the voting canister
    // expects normalized evaluation as input (0.0 ... 1.0 values)
    // if the evaluation is None, the solution is recognized as rejected (it does not receive any reward)
    // storypoints budget is split among all solutions weighted by their evaluation score
    //  example:
    //      if the task defines 100 storypoints as a budget, and ten solutions were provided - each scored 1.0 (max score)
    //          then each solver gets 10 storypoints
    //      if some solvers score 1.0, while others score 0.5, solvers with higher score will receive a higher reward (higher than 10 storypoints),
    //          than those scored less
    // highest evaluation score defines the cut of the budget being distributed
    //  example:
    //      if all solutions have mediocre evaluation e.g. 0.3, only 30% of total budget will be distributed among solvers
    //      if at least one solution is 1.0, then 100% of the total budget will be distributed
    // hours are rewarded to each solver in full, as defined in the task, but if the evaluation is not 0.0
    //  example:
    //      if the task defines 5 hours estimate and your solution receives a non-zero evaluation - you get 5 hours
    //      if your solution receives a zero evaluation (which is only possible if all votes was against you) - you get 0 hours
    pub fn evaluate(
        &mut self,
        evaluation_per_solution: Vec<(Principal, Option<E8s>)>,
    ) -> Vec<RewardEntry> {
        let mut result = Vec::new();

        let mut evaluation_sum = E8s::zero();
        let mut max_evaluation = E8s::zero();

        for (_solver, eval_opt) in evaluation_per_solution.iter() {
            if let Some(eval) = eval_opt {
                if eval > &max_evaluation {
                    max_evaluation = eval.clone();
                }

                evaluation_sum += eval;
            }
        }

        // the best result defines the budget spent
        let storypoints_budget_used_share = &self.storypoints_ext_budget * max_evaluation;
        let storypoints_budget_unit = storypoints_budget_used_share / evaluation_sum;

        for (solver, eval_opt) in evaluation_per_solution {
            let solution = self.solutions.get_mut(&solver).unwrap();

            if eval_opt.is_none() {
                solution.rejected = true;

                continue;
            }

            let eval = eval_opt.unwrap();

            let reward_storypoints = &self.storypoints_base + &storypoints_budget_unit * &eval;
            let reward_hours = self.hours_base.clone();

            solution.evaluation = Some(eval);
            solution.reward_hours = Some(reward_hours.clone());
            solution.reward_storypoints = Some(reward_storypoints.clone());

            let entry = RewardEntry {
                solver,
                reward_storypoints,
                reward_hours,
            };

            result.push(entry);
        }

        result
    }

    pub fn add_solver(&mut self, is_solver: bool, caller: Principal) {
        if is_solver {
            self.solvers.insert(caller);
        } else {
            self.solvers.remove(&caller);
        }
    }

    pub fn is_solver(&self, candidate: &Principal) -> bool {
        self.solvers.contains(candidate)
    }

    pub fn is_creator(&self, creator: &Principal) -> bool {
        self.creator.eq(creator)
    }

    pub fn is_team_only(&self) -> bool {
        self.solver_constraints
            .contains(&SolverConstraint::TeamOnly)
    }

    pub fn can_edit(&self) -> bool {
        matches!(self.stage, TaskStage::Edit)
    }

    pub fn can_solve(&self) -> bool {
        matches!(self.stage, TaskStage::Solve { until_timestamp: _ })
    }

    pub fn can_attach(&self) -> bool {
        matches!(
            self.stage,
            TaskStage::Edit | TaskStage::Solve { until_timestamp: _ }
        )
    }

    pub fn can_evaluate(&self) -> bool {
        matches!(self.stage, TaskStage::Evaluate)
    }

    pub fn can_delete(&self) -> bool {
        true
    }

    pub fn to_archived(self) -> ArchivedTask {
        ArchivedTask::V0001(ArchivedTaskV1 {
            id: self.id,
            title: self.title,
            description: self.description,
            created_at: self.created_at,
            creator: self.creator,
            solution_fields: self.solution_fields,
            solutions: self.solutions,
        })
    }
}

#[derive(CandidType, Deserialize, Clone, Copy)]
pub enum TaskStage {
    Edit,
    Solve { until_timestamp: TimestampNs },
    Evaluate,
}

#[derive(CandidType, Deserialize, Clone, Validate)]
pub struct RewardEntry {
    #[garde(skip)]
    pub solver: Principal,
    #[garde(skip)]
    pub reward_hours: E8s,
    #[garde(skip)]
    pub reward_storypoints: E8s,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct Solution {
    pub fields: Vec<Option<String>>,
    pub attached_at: TimestampNs,
    pub rejected: bool,
    pub evaluation: Option<E8s>,
    pub reward_hours: Option<E8s>,
    pub reward_storypoints: Option<E8s>,
}

impl Solution {
    pub fn new(fields: Vec<Option<String>>, now: TimestampNs) -> Self {
        Self {
            fields,
            attached_at: now,
            rejected: false,
            evaluation: None,
            reward_hours: None,
            reward_storypoints: None,
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Copy, Validate, PartialEq, Eq, PartialOrd, Ord)]
pub enum SolverConstraint {
    TeamOnly,
}

#[derive(CandidType, Deserialize, Clone, Validate)]
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
    pub fn validate_field(&self, field: &Option<String>) -> Result<(), String> {
        if let Some(value) = field {
            match &self.kind {
                SolutionFieldKind::Md => Ok(()),
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

#[derive(CandidType, Deserialize, Clone, Copy, Validate)]
pub enum SolutionFieldKind {
    Md,
    Url {
        #[garde(dive)]
        kind: URLKind,
    },
}

#[derive(CandidType, Deserialize, Clone, Copy, Validate)]
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

#[derive(CandidType, Deserialize, Clone)]
pub enum ArchivedTask {
    V0001(ArchivedTaskV1),
}

#[derive(CandidType, Deserialize, Clone)]
pub struct ArchivedTaskV1 {
    pub id: TaskId,
    pub title: String,
    pub description: String,
    pub created_at: TimestampNs,
    pub creator: Principal,
    pub solution_fields: Vec<SolutionField>,
    pub solutions: BTreeMap<Principal, Solution>,
}
