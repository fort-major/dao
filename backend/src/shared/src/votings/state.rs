use std::collections::BTreeMap;

use candid::{CandidType, Principal};
use serde::Deserialize;

use crate::{CanisterIds, DurationNs, GuardContext, TimestampNs};

use super::{
    api::{CastVoteRequest, GetVotingsRequest, GetVotingsResponse, StartVotingRequest},
    types::{CallToExecute, Voting, VotingId},
};

#[derive(CandidType, Deserialize)]
pub struct VotingsState {
    pub votings: BTreeMap<VotingId, Voting>,
}

impl VotingsState {
    pub fn new() -> Self {
        Self {
            votings: BTreeMap::new(),
        }
    }

    pub fn start_voting(
        &mut self,
        req: StartVotingRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> (VotingId, DurationNs) {
        let voting = Voting::new(
            req.proof.profile_proof.reputation_total_supply,
            req.kind,
            caller,
            now,
        );

        let id = voting.id;
        let duration = voting.base.duration_ns;

        self.votings.insert(id, voting);

        (id, duration)
    }

    pub fn cast_vote(
        &mut self,
        req: CastVoteRequest,
        ctx: &GuardContext,
    ) -> Option<(VotingId, CallToExecute)> {
        let voting = self.votings.get_mut(&req.id).unwrap();

        voting
            .cast_vote(
                req.option_idx,
                req.approval_level,
                req.proof.profile_proof.reputation,
                &ctx.canister_ids,
                ctx.caller,
            )
            .map(|it| (req.id, it))
    }

    pub fn resolve_on_timer(
        &mut self,
        id: VotingId,
        canister_ids: &CanisterIds,
    ) -> Option<(VotingId, CallToExecute)> {
        let voting = self.votings.get_mut(&id)?;

        if !voting.can_execute_on_timer() {
            return None;
        }

        voting.resolve_on_timer(canister_ids).map(|it| (id, it))
    }

    pub fn get_votings(&self, req: GetVotingsRequest) -> GetVotingsResponse {
        let votings = req
            .ids
            .iter()
            .map(|id| self.votings.get(&id).map(|it| it.as_ext()))
            .collect();

        GetVotingsResponse { votings }
    }
}
