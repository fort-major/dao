use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;

use crate::tasks::tasks::RewardEntry;

#[derive(CandidType, Deserialize, Validate)]
pub struct AreTeamMembersRequest {
    #[garde(length(min = 1))]
    pub ids: Vec<Principal>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct AreTeamMembersResponse {
    #[garde(skip)]
    pub results: Vec<bool>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct MintRewardsRequest {
    #[garde(skip)]
    pub rewards: Vec<RewardEntry>,
}

// TODO: impl Guard for them, check if Mint happens from the tasks canister

#[derive(CandidType, Deserialize, Validate)]
pub struct MintRewardsResponse {}
