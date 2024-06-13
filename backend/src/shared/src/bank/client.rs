use candid::Principal;
use ic_cdk::{api::call::CallResult, call};

use super::api::{
    GetExchangeRatesRequest, GetExchangeRatesResponse, SetExchangeRateRequest,
    SetExchangeRateResponse, SwapRewardsRequest, SwapRewardsResponse,
};

pub struct BankCanisterClient {
    pub canister_id: Principal,
}

impl BankCanisterClient {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    #[allow(non_snake_case)]
    pub async fn bank__set_exchange_rate(
        &self,
        req: SetExchangeRateRequest,
    ) -> CallResult<SetExchangeRateResponse> {
        call(self.canister_id, "bank__set_exchange_rate", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn bank__swap_rewards(
        &self,
        req: SwapRewardsRequest,
    ) -> CallResult<SwapRewardsResponse> {
        call(self.canister_id, "bank__swap_rewards", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn bank__get_exchange_rates(
        &self,
        req: GetExchangeRatesRequest,
    ) -> CallResult<GetExchangeRatesResponse> {
        call(self.canister_id, "bank__get_exchange_rates", (req,))
            .await
            .map(|(it,)| it)
    }
}
