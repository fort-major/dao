use async_trait::async_trait;
use candid::CandidType;
use garde::Validate;
use serde::Deserialize;

use crate::{
    proof::Proof,
    tasks::{api::GetTasksRequest, client::TasksCanisterClient},
    Guard,
};

use super::{
    state::VotingsState,
    types::{VotingId, VotingKind},
};

#[derive(CandidType, Deserialize, Validate)]
pub struct StartVotingRequest {
    #[garde(dive)]
    pub kind: VotingKind,
    #[garde(dive)]
    pub proof: Proof,
}

#[async_trait]
impl Guard<VotingsState> for StartVotingRequest {
    async fn validate_and_escape(
        &mut self,
        state: &VotingsState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;
        self.proof.assert_valid_for(&ctx.caller)?;

        if !self.proof.profile_proof.is_team_member {
            return Err(format!("Only team members can start votings"));
        }

        let id = self.kind.to_id();

        if let Some(voting) = state.votings.get(&id) {
            return Err(format!("The voting is already in progress"));
        }

        match &mut self.kind {
            VotingKind::FinishEditTask { task_id } => {
                let tasks_canister = TasksCanisterClient::new(ctx.canister_ids.tasks_canister_id);
                let task = tasks_canister
                    .tasks__get_tasks(GetTasksRequest {
                        ids: vec![*task_id],
                    })
                    .await
                    .map_err(|(c, m)| format!("Can't call tasks canister [{:?}]: {}", c, m))?
                    .tasks[0]
                    .ok_or(format!("Task not found"))?;

                if !task.can_edit() {
                    return Err(format!("The task is in invalid state"));
                }

                Ok(())
            }
            VotingKind::EvaluateTask { task_id, solutions } => {
                let tasks_canister = TasksCanisterClient::new(ctx.canister_ids.tasks_canister_id);
                let task = tasks_canister
                    .tasks__get_tasks(GetTasksRequest {
                        ids: vec![*task_id],
                    })
                    .await
                    .map_err(|(c, m)| format!("Can't call tasks canister [{:?}]: {}", c, m))?
                    .tasks[0]
                    .ok_or(format!("Task not found"))?;

                if !task.can_evaluate() {
                    return Err(format!("The task is in invalid state"));
                }

                *solutions = task.solutions.keys().copied().collect();

                Ok(())
            }
        }
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct StartVotingResponse {
    #[garde(skip)]
    pub id: VotingId,
}
