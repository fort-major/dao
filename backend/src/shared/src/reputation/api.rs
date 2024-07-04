use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;

use crate::{e8s::E8s, Guard};

use super::{
    state::ReputationState,
    types::{RepBalanceEntry, ReputationProof},
};

#[derive(CandidType, Deserialize, Validate)]
pub struct MintRepRequest {
    #[garde(length(min = 1))]
    pub entries: Vec<(Principal, E8s)>,
}

impl Guard<ReputationState> for MintRepRequest {
    fn validate_and_escape(
        &mut self,
        _state: &ReputationState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct MintRepResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetBalanceRequest {
    #[garde(length(min = 1))]
    pub accounts: Vec<Principal>,
}

impl Guard<ReputationState> for GetBalanceRequest {
    fn validate_and_escape(
        &mut self,
        _state: &ReputationState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetBalanceResponse {
    #[garde(skip)]
    pub balances: Vec<RepBalanceEntry>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetTotalSupplyRequest {}

impl Guard<ReputationState> for GetTotalSupplyRequest {
    fn validate_and_escape(
        &mut self,
        _state: &ReputationState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetTotalSupplyResponse {
    #[garde(skip)]
    pub total_supply: E8s,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetRepProofRequest {}

impl Guard<ReputationState> for GetRepProofRequest {
    fn validate_and_escape(
        &mut self,
        _state: &ReputationState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetRepProofResponse {
    #[garde(skip)]
    pub marker: String,
    #[garde(skip)]
    pub proof: ReputationProof,
}
