use std::collections::BTreeMap;

use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;
use shared::{
    tasks::{
        BasicCrowdsourceTaskKind, BasicTeamTaskKind, BasicTeamTaskStatus, CreateTaskRequest,
        CreateTaskRequestKind, Task, TaskId, TaskKind, TaskStatus,
        TransitionBasicTeamTaskStatusRequest, UpdateTaskRequest, UpdateTaskRequestKind,
    },
    TimestampNs,
};

#[derive(CandidType, Deserialize)]
pub struct State {
    pub rewards_canister_id: Principal,
    pub votings_canister_id: Principal,
    pub task_id_generator: TaskId,
    pub tasks: BTreeMap<TaskId, Task>,
}

impl State {
    pub fn new(rewards_canister_id: Principal, votings_canister_id: Principal) -> Self {
        Self {
            rewards_canister_id,
            votings_canister_id,
            task_id_generator: 0,
            tasks: BTreeMap::new(),
        }
    }

    pub fn create_task(
        &mut self,
        mut req: CreateTaskRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> Result<(), String> {
        req.validate(&()).map_err(|e| e.to_string())?;
        req.escape();

        let task_kind = match req.kind {
            CreateTaskRequestKind::BasicTeam(k) => TaskKind::BasicTeam(BasicTeamTaskKind::new(
                k.assignee,
                k.storypoints_e8s,
                k.hours_e8s,
            )),
            CreateTaskRequestKind::BasicCrowdsource(k) => {
                TaskKind::BasicCrowdsource(BasicCrowdsourceTaskKind::new(k.storypoints_budget_e8s))
            }
        };

        let task = Task {
            id: self.generate_id(),
            title: req.title,
            description: req.description,
            created_at: now,
            updated_at: 0,
            creator: caller,
            kind: task_kind,
        };

        self.tasks.insert(task.id, task);

        Ok(())
    }

    pub fn update_task(
        &mut self,
        mut req: UpdateTaskRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> Result<(), String> {
        req.validate(&()).map_err(|e| e.to_string())?;
        req.escape();

        let task = self
            .tasks
            .get_mut(&req.id)
            .ok_or(format!("Task {} not found", req.id))?;

        task.assert_can_be_edited()?;

        if task.creator != caller {
            return Err(format!("Only the creator of a task can edit it"));
        }

        if let Some(new_kind) = req.kind {
            match new_kind {
                UpdateTaskRequestKind::BasicTeam(new_k) => match &mut task.kind {
                    TaskKind::BasicTeam(k) => {
                        if let Some(new_assignee) = new_k.assignee {
                            k.assignee = new_assignee;
                        }

                        if let Some(new_storypoints_e8s) = new_k.storypoints_e8s {
                            k.storypoints_e8s = new_storypoints_e8s;
                        }

                        if let Some(new_hours_e8s) = new_k.hours_e8s {
                            k.hours_e8s = new_hours_e8s;
                        }
                    }
                    TaskKind::BasicCrowdsource(_) => {
                        return Err(format!("Task {} has incompatible kind", task.id));
                    }
                },
                UpdateTaskRequestKind::BasicCrowdsource(new_k) => match &mut task.kind {
                    TaskKind::BasicTeam(_) => {
                        return Err(format!("Task {} has incompatible kind", task.id));
                    }
                    TaskKind::BasicCrowdsource(k) => {
                        if let Some(new_storypoints_budget_e8s) = new_k.storypoints_budget_e8s {
                            k.storypoints_budget_e8s = new_storypoints_budget_e8s;
                        }
                    }
                },
            }
        }

        if let Some(new_title) = req.title {
            task.title = new_title;
        }

        if let Some(new_desc) = req.description {
            task.description = new_desc;
        }

        task.updated_at = now;

        Ok(())
    }

    pub fn transition_basic_team_task_status(
        &mut self,
        req: TransitionBasicTeamTaskStatusRequest,
        caller: Principal,
        this_canister_id: Principal,
    ) -> Result<(), String> {
        req.validate(&()).map_err(|e| e.to_string())?;

        let task = self
            .tasks
            .get_mut(&req.id)
            .ok_or(format!("Task {} not found", req.id))?;

        match &mut task.kind {
            TaskKind::BasicTeam(k) => {
                if (matches!(k.status, BasicTeamTaskStatus::Backlog)
                    && matches!(req.new_status, BasicTeamTaskStatus::ToDo))
                {
                    if task.creator == caller {
                        return Ok(());
                    }

                    if let Some(assignee) = k.assignee {
                        if assignee == caller {
                            return Ok(());
                        }
                    }

                    return Err(format!("Access denied"));                    
                }

                if (matches!(k.status, BasicTeamTaskStatus::ToDo) && matches!(req.new_status, Basi))

            }
            TaskKind::BasicCrowdsource(k) => Err(format!(
                "Task {} is of kind BasicCrowdsource, but is treated like BasicTeam",
                req.id
            )),
        }
    }

    fn generate_id(&mut self) -> TaskId {
        let result = self.task_id_generator;
        self.task_id_generator += 1;

        result
    }
}
