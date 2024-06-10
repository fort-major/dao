use std::collections::{btree_map::Entry, BTreeMap};

use candid::{CandidType, Nat, Principal};
use garde::Validate;
use serde::Deserialize;

use crate::TimestampNs;

pub type TaskId = u64;

#[derive(CandidType, Deserialize, Validate)]
pub struct Task {
    #[garde(skip)]
    pub id: TaskId,
    #[garde(length(graphemes, min = 4, max = 256))]
    pub title: String,
    #[garde(length(graphemes, min = 16, max = 4096))]
    pub description: String,
    #[garde(skip)]
    pub created_at: TimestampNs,
    #[garde(skip)]
    pub updated_at: TimestampNs,
    #[garde(skip)]
    pub creator: Principal,
    #[garde(dive)]
    pub kind: TaskKind,
}

impl Task {
    pub fn escape(&mut self) {
        self.title = html_escape::encode_script(&self.title).to_string();
        self.description = html_escape::encode_script(&self.description).to_string();
    }

    pub fn add_solution(
        &mut self,
        url: String,
        caller: Principal,
        now: TimestampNs,
    ) -> Result<(), String> {
        match &mut self.kind {
            TaskKind::BasicTeam(k) => k.add_solution(url, caller, now),
            TaskKind::BasicCrowdsource(k) => k.add_solution(url, caller, now),
        }
    }

    pub fn assert_can_be_edited(&self) -> Result<(), String> {
        let can_be_edited = match &self.kind {
            TaskKind::BasicTeam(k) => k.can_be_edited(),
            TaskKind::BasicCrowdsource(k) => k.can_be_edited(),
        };

        if !can_be_edited {
            Err(format!("Task {} can not be edited anymore", self.id))
        } else {
            Ok(())
        }
    }

    pub fn assert_can_be_solved(&self) -> Result<(), String> {
        let can_be_solved = match &self.kind {
            TaskKind::BasicTeam(k) => k.can_be_solved(),
            TaskKind::BasicCrowdsource(k) => k.can_be_solved(),
        };

        if !can_be_solved {
            Err(format!(
                "Can't attach a solution to task {} - invalid task state",
                self.id
            ))
        } else {
            Ok(())
        }
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub enum TaskKind {
    BasicTeam(#[garde(dive)] BasicTeamTaskKind),
    BasicCrowdsource(#[garde(dive)] BasicCrowdsourceTaskKind),
}

#[derive(CandidType, Deserialize, Validate)]
pub struct BasicTeamTaskKind {
    #[garde(dive)]
    pub status: BasicTeamTaskStatus,
    #[garde(skip)]
    pub assignee: Option<Principal>,
    #[garde(skip)]
    pub storypoints_e8s: Nat,
    #[garde(skip)]
    pub hours_e8s: Nat,
    #[garde(skip)] // validated on update
    pub solution: Option<TaskSolution>,
}

impl BasicTeamTaskKind {
    pub fn new(assignee: Option<Principal>, storypoints_e8s: Nat, hours_e8s: Nat) -> Self {
        Self {
            status: BasicTeamTaskStatus::Backlog,
            assignee,
            storypoints_e8s,
            hours_e8s,
            solution: None,
        }
    }

    pub fn can_be_edited(&self) -> bool {
        matches!(
            self.status,
            BasicTeamTaskStatus::Backlog
                | BasicTeamTaskStatus::ToDo
                | BasicTeamTaskStatus::InProgress
        )
    }

    pub fn can_be_solved(&self) -> bool {
        matches!(self.status, BasicTeamTaskStatus::InProgress)
    }

    pub fn add_solution(
        &mut self,
        url: String,
        caller: Principal,
        now: TimestampNs,
    ) -> Result<(), String> {
        if let Some(assignee) = self.assignee {
            if assignee == caller {
                self.solution = Some(TaskSolution {
                    url,
                    attached_at: now,
                    approved: false,
                });

                Ok(())
            } else {
                Err(format!("{} is not an assignee", caller))
            }
        } else {
            Err(format!("No assignee specified for the task"))
        }
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub enum BasicTeamTaskStatus {
    Backlog,
    ToDo,
    InProgress,
    InReview,
    Done,
    Rejected,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct BasicCrowdsourceTaskKind {
    #[garde(dive)]
    pub status: BasicCrowdsourceTaskStatus,
    #[garde(skip)]
    pub storypoints_budget_e8s: Nat,
    #[garde(skip)] // validated on update
    pub solutions: BTreeMap<Principal, Vec<TaskSolution>>,
}

impl BasicCrowdsourceTaskKind {
    pub fn new(storypoints_budget_e8s: Nat) -> Self {
        Self {
            status: BasicCrowdsourceTaskStatus::Backlog,
            storypoints_budget_e8s,
            solutions: BTreeMap::new(),
        }
    }

    pub fn can_be_edited(&self) -> bool {
        matches!(
            self.status,
            BasicCrowdsourceTaskStatus::Backlog | BasicCrowdsourceTaskStatus::InProgress
        )
    }

    pub fn can_be_solved(&self) -> bool {
        matches!(self.status, BasicCrowdsourceTaskStatus::InProgress)
    }

    pub fn add_solution(
        &mut self,
        url: String,
        caller: Principal,
        now: TimestampNs,
    ) -> Result<(), String> {
        let solution = TaskSolution {
            url,
            attached_at: now,
            approved: false,
        };

        match self.solutions.entry(caller) {
            Entry::Occupied(mut e) => {
                e.get_mut().push(solution);
            }
            Entry::Vacant(e) => {
                e.insert(vec![solution]);
            }
        };

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub enum BasicCrowdsourceTaskStatus {
    Backlog,
    InProgress,
    InReview,
    Done,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct TaskSolution {
    #[garde(url, length(graphemes, min = 5, max = 512))]
    pub url: String,
    #[garde(skip)]
    pub attached_at: TimestampNs,
    #[garde(skip)]
    pub approved: bool,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct CreateTaskRequest {
    #[garde(length(graphemes, min = 4, max = 256))]
    pub title: String,
    #[garde(length(graphemes, min = 16, max = 4096))]
    pub description: String,
    #[garde(dive)]
    pub kind: CreateTaskRequestKind,
}

impl CreateTaskRequest {
    pub fn escape(&mut self) {
        self.title = html_escape::encode_script(&self.title).to_string();
        self.description = html_escape::encode_script(&self.description).to_string();
    }
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub enum CreateTaskRequestKind {
    BasicTeam(#[garde(dive)] CreateBasicTeamTaskRequestKind),
    BasicCrowdsource(#[garde(dive)] CreateBasicCrowdsourceTaskRequestKind),
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct CreateBasicTeamTaskRequestKind {
    #[garde(skip)]
    pub assignee: Option<Principal>,
    #[garde(skip)]
    pub storypoints_e8s: Nat,
    #[garde(skip)]
    pub hours_e8s: Nat,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct CreateBasicCrowdsourceTaskRequestKind {
    #[garde(skip)]
    pub storypoints_budget_e8s: Nat,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct UpdateTaskRequest {
    #[garde(skip)]
    pub id: TaskId,
    #[garde(length(graphemes, min = 4, max = 256))]
    pub title: Option<String>,
    #[garde(length(graphemes, min = 16, max = 4096))]
    pub description: Option<String>,
    #[garde(dive)]
    pub kind: Option<UpdateTaskRequestKind>,
}

impl UpdateTaskRequest {
    pub fn escape(&mut self) {
        if let Some(title) = &mut self.title {
            *title = html_escape::encode_script(title).to_string();
        }

        if let Some(description) = &mut self.description {
            *description = html_escape::encode_script(description).to_string();
        }
    }
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub enum UpdateTaskRequestKind {
    BasicTeam(#[garde(dive)] UpdateBasicTeamTaskRequestKind),
    BasicCrowdsource(#[garde(dive)] UpdateBasicCrowdsourceTaskRequestKind),
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct UpdateBasicTeamTaskRequestKind {
    #[garde(skip)]
    pub assignee: Option<Option<Principal>>,
    #[garde(skip)]
    pub storypoints_e8s: Option<Nat>,
    #[garde(skip)]
    pub hours_e8s: Option<Nat>,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct UpdateBasicCrowdsourceTaskRequestKind {
    #[garde(skip)]
    pub storypoints_budget_e8s: Option<Nat>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct TransitionBasicTeamTaskStatusRequest {
    #[garde(skip)]
    pub id: TaskId,
    #[garde(dive)]
    pub new_status: BasicTeamTaskStatus,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct TransitionBasicCrowdsourceTaskStatusRequest {
    #[garde(skip)]
    pub id: TaskId,
    #[garde(dive)]
    pub new_status: BasicCrowdsourceTaskStatus,
}
