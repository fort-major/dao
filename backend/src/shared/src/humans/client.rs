use candid::Principal;
use ic_cdk::{api::call::CallResult, call};

use super::{
    api::{AreTeamMembersRequest, AreTeamMembersResponse, MintRewardsRequest, MintRewardsResponse},
    types::{GetInfoRequest, GetInfoResponse, MintRequest, RefundRequest, SpendRequest},
};

pub struct HumansCanisterClient {
    pub canister_id: Principal,
}

impl HumansCanisterClient {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    pub async fn are_team_members(
        &self,
        req: AreTeamMembersRequest,
    ) -> CallResult<AreTeamMembersResponse> {
        // TODO: this is a stub
        Ok(AreTeamMembersResponse {
            results: req.ids.into_iter().map(|_| true).collect(),
        })
    }

    pub async fn mint_rewards(&self, req: MintRewardsRequest) -> CallResult<MintRewardsResponse> {
        // TODO
        Ok(MintRewardsResponse {})
    }
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
