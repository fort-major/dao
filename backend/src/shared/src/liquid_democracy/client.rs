use candid::Principal;
use ic_cdk::{api::call::CallResult, call};

use super::api::{
    FollowRequest, FollowResponse, GetDecisionTopicsRequest, GetDecisionTopicsResponse,
    GetFolloweesOfRequest, GetFolloweesOfResponse, GetFollowersOfRequest, GetFollowersOfResponse,
};

pub struct LiquidDemocracyCanisterClient {
    pub canister_id: Principal,
}

impl LiquidDemocracyCanisterClient {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    #[allow(non_snake_case)]
    pub async fn liquid_democracy__follow(&self, req: FollowRequest) -> CallResult<FollowResponse> {
        call(self.canister_id, "liquid_democracy__follow", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn liquid_democracy__get_followers_of(
        &self,
        req: GetFollowersOfRequest,
    ) -> CallResult<GetFollowersOfResponse> {
        call(
            self.canister_id,
            "liquid_democracy__get_followers_of",
            (req,),
        )
        .await
        .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn liquid_democracy__get_followees_of(
        &self,
        req: GetFolloweesOfRequest,
    ) -> CallResult<GetFolloweesOfResponse> {
        call(
            self.canister_id,
            "liquid_democracy__get_followees_of",
            (req,),
        )
        .await
        .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn liquid_democracy__get_decision_topics(
        &self,
        req: GetDecisionTopicsRequest,
    ) -> CallResult<GetDecisionTopicsResponse> {
        call(
            self.canister_id,
            "liquid_democracy__get_decision_topics",
            (req,),
        )
        .await
        .map(|(it,)| it)
    }
}
