use std::collections::BTreeSet;

use candid::{CandidType, Deserialize, Principal};
use garde::Validate;

use crate::{proof::Proof, Guard};

use super::{state::LiquidDemocracyState, types::DecisionTopicSet};

#[derive(CandidType, Deserialize, Validate)]
pub struct FollowRequest {
    #[garde(skip)]
    pub followee: Principal,
    #[garde(skip)]
    pub topics: Option<DecisionTopicSet>,
    #[garde(skip)]
    pub proof: Proof,
}

impl Guard<LiquidDemocracyState> for FollowRequest {
    fn validate_and_escape(
        &mut self,
        state: &LiquidDemocracyState,
        caller: Principal,
        now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        self.proof.assert_valid_for(caller, now)?;

        if !state.i_follow.contains_key(&caller) {
            return Err(format!("Not registered"));
        }

        if !state.i_follow.contains_key(&self.followee) {
            return Err(format!("The followee is not registered"));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct FollowResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetFollowersOfRequest {
    #[garde(length(min = 1))]
    pub ids: Vec<Principal>,
}

impl Guard<LiquidDemocracyState> for GetFollowersOfRequest {
    fn validate_and_escape(
        &mut self,
        state: &LiquidDemocracyState,
        caller: Principal,
        now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetFollowersOfResponse {
    #[garde(skip)]
    pub entries: Vec<BTreeSet<Principal>>,
}
