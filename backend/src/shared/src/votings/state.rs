use std::collections::{BTreeMap, LinkedList};

use candid::{CandidType, Principal};

use serde::Deserialize;

use crate::{liquid_democracy::types::DecisionTopicId, TimestampNs};

use super::{
    api::{
        CastVoteRequest, CastVoteResponse, GetVotingEventsRequest, GetVotingEventsResponse,
        GetVotingsRequest, GetVotingsResponse, StartVotingRequest, StartVotingResponse,
    },
    types::{CallToExecute, Voting, VotingEvent, VotingEventV1, VotingId, VotingTimer},
};

const EVENTS_LOG_LEN: usize = 1000;

#[derive(CandidType, Deserialize, Default)]
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
        topics: Vec<DecisionTopicId>,
        caller: Principal,
        now: TimestampNs,
    ) -> (StartVotingResponse, VotingTimer) {
        let voting = Voting::new(
            req.reputation_proof
                .body
                .expect("The proof is not computed")
                .reputation_total_supply,
            req.kind,
            topics,
            caller,
            now,
        );

        let resp = StartVotingResponse { id: voting.id };
        let timer = VotingTimer::ExecOnQuorum {
            voting_id: voting.id,
            timestamp: now + voting.base.duration_ns,
        };
        let event = VotingEvent::V0001(VotingEventV1::VotingCreated {
            voting_id: voting.id,
            creator: voting.base.creator,
            quorum: voting.base.quorum.clone(),
            consensus_normalized: voting.base.consensus_normalized.clone(),
            finish_early: voting.base.finish_early.clone(),
            num_options: voting.base.votes_per_option.len() as u32,
        });

        self.votings.insert(voting.id, voting);
        self.save_event(event);

        (resp, timer)
    }

    pub fn cast_vote(
        &mut self,
        req: CastVoteRequest,
        _caller: Principal,
    ) -> (CastVoteResponse, Option<CallToExecute>) {
        let rep_proof = req.proof.body.expect("The proof is not computed");
        let voting = self.votings.get_mut(&req.id).unwrap();

        let result = voting.cast_vote(
            req.option_idx,
            req.normalized_approval_level,
            rep_proof.reputation_delegation_tree,
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
                self.delete_voting(req.id);

                (
                    CastVoteResponse {
                        decision_made: true,
                    },
                    None,
                )
            }
        }
    }

    pub fn resolve_on_timer(&mut self, id: VotingId) -> Option<CallToExecute> {
        // ignore if no voting is found or invalid state - it means that the timer is triggered for an already finished voting
        let voting = self.votings.get_mut(&id)?;

        if !voting.can_execute_on_timer() {
            return None;
        }

        match voting.resolve_on_timer() {
            Ok(c) => Some(c),
            Err(event) => {
                self.save_event(event);
                self.delete_voting(id);

                None
            }
        }
    }

    pub fn delete_voting(&mut self, id: VotingId) {
        self.votings.remove(&id);
    }

    pub fn get_votings(&self, req: GetVotingsRequest, caller: Principal) -> GetVotingsResponse {
        let votings = req
            .ids
            .iter()
            .map(|id| self.votings.get(&id).map(|it| it.as_ext(caller)))
            .collect();

        GetVotingsResponse { entries: votings }
    }

    pub fn save_event(&mut self, event: VotingEvent) {
        if self.events.len() == EVENTS_LOG_LEN {
            self.events.pop_back();
        }

        self.events.push_front(event);
    }

    pub fn get_events(&self, _req: GetVotingEventsRequest) -> GetVotingEventsResponse {
        GetVotingEventsResponse {
            events: self.events.iter().cloned().collect(),
        }
    }

    pub fn save_timer(&mut self, id: VotingId, timer: VotingTimer) {
        self.timers.insert(id, timer);
    }

    pub fn remove_timer(&mut self, id: &VotingId) {
        self.timers.remove(id);
    }
}
