use candid::CandidType;
use garde::Validate;
use serde::Deserialize;

use crate::{e8s::E8s, proof::Proof, Guard};

use super::{
    state::VotingsState,
    types::{VotingEvent, VotingExt, VotingId, VotingKind},
};

#[derive(CandidType, Deserialize, Validate)]
pub struct StartVotingRequest {
    #[garde(dive)]
    pub kind: VotingKind,
    #[garde(dive)]
    pub proof: Proof,
}

impl Guard<VotingsState> for StartVotingRequest {
    fn validate_and_escape(
        &mut self,
        state: &VotingsState,
        caller: candid::Principal,
        now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;
        self.proof.assert_valid_for(caller, now)?;

        if !self
            .proof
            .profile_proof
            .as_ref()
            .expect("UNREACHEABLE")
            .is_team_member
        {
            return Err(format!("Only team members can start votings"));
        }

        let id = self.kind.get_id();

        if let Some(_voting) = state.votings.get(&id) {
            return Err(format!("The voting is already in progress"));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct StartVotingResponse {
    #[garde(skip)]
    pub id: VotingId,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct CastVoteRequest {
    #[garde(skip)]
    pub id: VotingId,
    #[garde(skip)]
    pub proof: Proof,
    #[garde(skip)]
    pub option_idx: u32,
    #[garde(skip)]
    pub approval_level: Option<E8s>,
}

impl Guard<VotingsState> for CastVoteRequest {
    fn validate_and_escape(
        &mut self,
        state: &VotingsState,
        caller: candid::Principal,
        now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;
        self.proof.assert_valid_for(caller, now)?;

        if let Some(approval) = &self.approval_level {
            if approval
                > &self
                    .proof
                    .profile_proof
                    .as_ref()
                    .expect("UNREACHEABLE")
                    .reputation
            {
                return Err(format!("Not enough reputation to cast that vote"));
            }
        }

        let voting = state
            .votings
            .get(&self.id)
            .ok_or(format!("The voting does not exist"))?;

        if !voting.can_cast_vote() {
            return Err(format!("The voting is in invalid state"));
        }

        if self.option_idx as usize >= voting.base.votes_per_option.len() {
            return Err(format!("Option {} does not exist", self.option_idx));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct CastVoteResponse {
    #[garde(skip)]
    pub decision_made: bool,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetVotingsRequest {
    #[garde(length(min = 1))]
    pub ids: Vec<VotingId>,
}

impl Guard<VotingsState> for GetVotingsRequest {
    fn validate_and_escape(
        &mut self,
        _state: &VotingsState,
        _caller: candid::Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetVotingsResponse {
    #[garde(skip)]
    pub votings: Vec<Option<VotingExt>>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetVotingEventsRequest {}

impl Guard<VotingsState> for GetVotingEventsRequest {
    fn validate_and_escape(
        &mut self,
        _state: &VotingsState,
        _caller: candid::Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetVotingEventsResponse {
    #[garde(skip)]
    pub events: Vec<VotingEvent>,
}
