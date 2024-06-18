use candid::Principal;
use ic_cdk::{api::call::CallResult, call};

use super::api::{
    CastVoteRequest, CastVoteResponse, GetVotingsRequest, GetVotingsResponse, StartVotingRequest,
    StartVotingResponse,
};

pub struct VotingsCanisterClient {
    pub canister_id: Principal,
}

impl VotingsCanisterClient {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    #[allow(non_snake_case)]
    pub async fn votings__start_voting(
        &self,
        req: StartVotingRequest,
    ) -> CallResult<StartVotingResponse> {
        call(self.canister_id, "votings__start_voting", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn votings__cast_vote(&self, req: CastVoteRequest) -> CallResult<CastVoteResponse> {
        call(self.canister_id, "votings__cast_vote", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn votings__get_votings(
        &self,
        req: GetVotingsRequest,
    ) -> CallResult<GetVotingsResponse> {
        call(self.canister_id, "votings__get_votings", (req,))
            .await
            .map(|(it,)| it)
    }
}
