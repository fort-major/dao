use candid::{CandidType, Deserialize, Nat, Principal};
use garde::Validate;

#[derive(CandidType, Deserialize, Clone)]
pub struct RewardsInfo {
    pub hours_balance_e8s: Nat,
    pub total_earned_hours_e8s: Nat,
    pub storypoints_balance_e8s: Nat,
    pub total_earned_storypoints_e8s: Nat,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct InitRequest {
    pub tasks_canister: Principal,
    pub bank_canister: Principal,
    pub sasha: Principal,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct BalanceEntry {
    pub id: Principal,
    pub hours_e8s: Nat,
    pub storypoints_e8s: Nat,
}

#[derive(CandidType, Deserialize, Clone, Validate)]
pub struct MintRequest {
    #[garde(length(min = 1))]
    pub entries: Vec<BalanceEntry>,
}

pub type SpendRequest = BalanceEntry;

#[derive(CandidType, Deserialize, Clone)]
pub struct GetInfoRequest {
    pub of: Principal,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct GetInfoResponse {
    pub id: Principal,
    pub hours_total_supply_e8s: Nat,
    pub storypoints_total_supply_e8s: Nat,
    pub info: RewardsInfo,
}
