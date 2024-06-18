use std::collections::{BTreeMap, LinkedList};

use candid::{CandidType, Principal};
use serde::Deserialize;

use crate::{CanisterIds, ExecutionContext, TimestampNs};

use super::{
    api::{
        CastVoteRequest, CastVoteResponse, GetVotingsRequest, GetVotingsResponse,
        StartVotingRequest, StartVotingResponse,
    },
    types::{CallToExecute, Voting, VotingEvent, VotingId, VotingTimer},
};

const EVENTS_LOG_LEN: usize = 1000;

#[derive(CandidType, Deserialize)]
pub struct VotingsState {
    pub votings: BTreeMap<VotingId, Voting>,
    pub events: LinkedList<VotingEvent>,
    pub timers: BTreeMap<VotingId, VotingTimer>,
}

impl VotingsState {
    pub fn new() -> Self {
        Self {
            votings: BTreeMap::new(),
            events: LinkedList::new(),
            timers: BTreeMap::new(),
        }
    }

    pub fn start_voting(
        &mut self,
        req: StartVotingRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> (StartVotingResponse, VotingTimer) {
        let voting = Voting::new(
            req.proof
                .profile_proof
                .expect("Profile proof not computed")
                .reputation_total_supply,
            req.kind,
            caller,
            now,
        );

        let resp = StartVotingResponse { id: voting.id };
        let timer = VotingTimer::ExecOnQuorum {
            voting_id: voting.id,
            timestamp: now + voting.base.duration_ns,
        };
        let event = VotingEvent::VotingCreated {
            voting_id: voting.id,
            creator: voting.base.creator,
            quorum: voting.base.quorum.clone(),
            consensus: voting.base.consensus.clone(),
            finish_early: voting.base.finish_early.clone(),
            num_options: voting.base.votes_per_option.len() as u32,
        };

        self.votings.insert(voting.id, voting);
        self.save_event(event);

        (resp, timer)
    }

    pub fn cast_vote(
        &mut self,
        req: CastVoteRequest,
        ctx: &ExecutionContext,
    ) -> (CastVoteResponse, Option<CallToExecute>) {
        let voting = self.votings.get_mut(&req.id).unwrap();

        let result = voting.cast_vote(
            req.option_idx,
            req.approval_level,
            req.proof
                .profile_proof
                .expect("Profile proof not computed")
                .reputation,
            &ctx.canister_ids,
            ctx.caller,
        );

        match result {
            Ok(o) => (
                CastVoteResponse {
                    decision_made: o.is_some(),
                },
                o,
            ),
            Err(event) => {
                self.save_event(event);

                (
                    CastVoteResponse {
                        decision_made: true,
                    },
                    None,
                )
            }
        }
    }

    pub fn resolve_on_timer(
        &mut self,
        id: VotingId,
        canister_ids: &CanisterIds,
    ) -> Option<CallToExecute> {
        // ignore if no voting is found or invalid state - it means that the timer is triggered for an already finished voting
        let voting = self.votings.get_mut(&id)?;

        if !voting.can_execute_on_timer() {
            return None;
        }

        match voting.resolve_on_timer(canister_ids) {
            Ok(c) => Some(c),
            Err(event) => {
                self.save_event(event);
                None
            }
        }
    }

    pub fn delete_voting(&mut self, id: VotingId) {
        self.votings.remove(&id);
    }

    pub fn get_votings(&self, req: GetVotingsRequest) -> GetVotingsResponse {
        let votings = req
            .ids
            .iter()
            .map(|id| self.votings.get(&id).map(|it| it.as_ext()))
            .collect();

        GetVotingsResponse { votings }
    }

    pub fn save_event(&mut self, event: VotingEvent) {
        if self.events.len() == EVENTS_LOG_LEN {
            self.events.pop_back();
        }

        self.events.push_front(event);
    }

    pub fn save_timer(&mut self, id: VotingId, timer: VotingTimer) {
        self.timers.insert(id, timer);
    }

    pub fn remove_timer(&mut self, id: &VotingId) {
        self.timers.remove(id);
    }
}
