use candid::Principal;
use shared::tasks::{BasicCrowdsourceTaskStatus, BasicTeamTaskStatus, Task};

pub struct BTTSTransition {
    pub from: BasicTeamTaskStatus,
    pub to: Vec<BasicTeamTaskStatus>,
    pub by: BasicTeamTaskActor,
}

pub enum BasicTeamTaskActor {
    Creator,
    Assignee,
    CreatorOrAssignee,
    VotingCanister,
}

pub struct AllowedBasicTeamTaskStatusTransitions {
    pub transitions: Vec<BTTSTransition>,
}

impl AllowedBasicTeamTaskStatusTransitions {
    pub fn assert_allowed(
        &self,
        task_status: &BasicTeamTaskStatus,
        task_creator: &Principal,
        task_assignee: &Option<Principal>,
        new_status: &BasicTeamTaskStatus,
        voting_canister_id: &Principal,
        caller: &Principal,
    ) -> Result<(), String> {
        let transition = self
            .transitions
            .iter()
            .find(|it| matches!(it.from, task_status))
            .ok_or(format!("This transition is not allowed"))?;

        transition
            .to
            .iter()
            .find(|it| matches!(it, new_status))
            .ok_or(format!("This transition is not allowed"))?;

        let access_allowed = match transition.by {
            BasicTeamTaskActor::Creator => task_creator.eq(caller),
            BasicTeamTaskActor::Assignee => {
                if let Some(assignee) = task_assignee {
                    assignee.eq(caller)
                } else {
                    false
                }
            }
            BasicTeamTaskActor::CreatorOrAssignee => {
                if task_creator.eq(caller) {
                    true
                } else if let Some(assignee) = task_assignee {
                    assignee.eq(caller)
                } else {
                    false
                }
            }
            BasicTeamTaskActor::VotingCanister => voting_canister_id.eq(caller),
        };

        if !access_allowed {
            Err(format!("Access denied"))
        } else {
            Ok(())
        }
    }
}

impl Default for AllowedBasicTeamTaskStatusTransitions {
    fn default() -> Self {
        use BasicTeamTaskActor::{Assignee, Creator, CreatorOrAssignee, VotingCanister};
        use BasicTeamTaskStatus::{Backlog, Done, InProgress, InReview, Rejected, ToDo};

        Self {
            transitions: vec![
                BTTSTransition {
                    from: Backlog,
                    to: vec![ToDo, InProgress, InReview],
                    by: CreatorOrAssignee,
                },
                BTTSTransition {
                    from: ToDo,
                    to: vec![Backlog, InProgress, InReview],
                    by: CreatorOrAssignee,
                },
                BTTSTransition {
                    from: InProgress,
                    to: vec![Backlog, ToDo, InProgress, InReview],
                    by: CreatorOrAssignee,
                },
                BTTSTransition {
                    from: InReview,
                    to: vec![Done, Rejected],
                    by: VotingCanister,
                },
            ],
        }
    }
}
