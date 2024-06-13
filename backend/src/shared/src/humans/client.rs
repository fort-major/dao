use candid::Principal;
use ic_cdk::api::call::CallResult;

use super::api::{
    AreTeamMembersRequest, AreTeamMembersResponse, MintRewardsRequest, MintRewardsResponse,
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
