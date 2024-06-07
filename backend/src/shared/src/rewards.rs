use candid::{CandidType, Deserialize, Nat, Principal};
use garde::Validate;
use ic_cdk::{api::call::CallResult, call};

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
pub struct RefundRequest {
    pub id: Principal,
    pub hours_e8s: Nat,
    pub storypoints_e8s: Nat,
}

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

pub struct RewardsCanisterClient {
    pub canister_id: Principal,
}

impl RewardsCanisterClient {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    pub async fn mint(&self, req: MintRequest) -> CallResult<()> {
        call(self.canister_id, "mint", (req,)).await
    }

    pub async fn spend(&self, req: SpendRequest) -> CallResult<()> {
        call(self.canister_id, "spend", (req,)).await
    }

    pub async fn refund(&self, req: RefundRequest) -> CallResult<()> {
        call(self.canister_id, "refund", (req,)).await
    }

    pub async fn get_info_of(&self, req: GetInfoRequest) -> CallResult<(GetInfoResponse,)> {
        call(self.canister_id, "get_info_of", (req,)).await
    }
}
