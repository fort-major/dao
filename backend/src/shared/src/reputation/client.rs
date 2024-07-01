use candid::Principal;
use ic_cdk::{api::call::CallResult, call};

use super::api::{
    GetBalanceRequest, GetBalanceResponse, GetRepProofRequest, GetRepProofResponse, MintRepRequest,
    MintRepResponse,
};

pub struct ReputationCanisterClient {
    pub canister_id: Principal,
}

impl ReputationCanisterClient {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    #[allow(non_snake_case)]
    pub async fn reputation__get_reputation_proof(
        &self,
        req: GetRepProofRequest,
    ) -> CallResult<GetRepProofResponse> {
        call(self.canister_id, "reputation__get_reputation_proof", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn reputation__get_balance(
        &self,
        req: GetBalanceRequest,
    ) -> CallResult<GetBalanceResponse> {
        call(self.canister_id, "reputation__get_balance", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn reputation__mint(&self, req: MintRepRequest) -> CallResult<MintRepResponse> {
        call(self.canister_id, "reputation__mint", (req,))
            .await
            .map(|(it,)| it)
    }
}
