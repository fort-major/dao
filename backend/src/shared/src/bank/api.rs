use candid::{CandidType, Deserialize, Principal};
use garde::Validate;
use icrc_ledger_types::icrc1::transfer::BlockIndex;

use crate::{e8s::E8s, Guard};

use super::{
    state::BankState,
    types::{SwapFrom, SwapInto},
};

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct SwapRewardsRequest {
    #[garde(dive)]
    pub from: SwapFrom,
    #[garde(dive)]
    pub into: SwapInto,
    #[garde(skip)]
    pub qty: E8s,
}

impl Guard<BankState> for SwapRewardsRequest {
    fn validate_and_escape(
        &mut self,
        state: &BankState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if self.qty == E8s::zero() {
            Err(format!("Empty swap request"))
        } else {
            Ok(())
        }
    }
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct SwapRewardsResponse {
    #[garde(skip)]
    pub asset: Principal,
    #[garde(skip)]
    pub block_idx: BlockIndex,
    #[garde(skip)]
    pub qty: E8s,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct SetExchangeRateRequest {
    #[garde(dive)]
    pub from: SwapFrom,
    #[garde(dive)]
    pub into: SwapInto,
    #[garde(skip)]
    pub rate: E8s,
}

impl Guard<BankState> for SetExchangeRateRequest {
    fn validate_and_escape(
        &mut self,
        state: &BankState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if ctx.caller_is_voting_canister {
            Ok(())
        } else {
            Err(format!("Access denied"))
        }
    }
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct SetExchangeRateResponse {}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct GetExchangeRatesRequest {}

impl Guard<BankState> for GetExchangeRatesRequest {
    fn validate_and_escape(
        &mut self,
        state: &BankState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct GetExchangeRatesResponse {
    // rates are expressed as how much <into> one gets for 1.00 <from>
    #[garde(skip)]
    pub exchange_rates: Vec<(SwapFrom, SwapInto, E8s)>,
}
