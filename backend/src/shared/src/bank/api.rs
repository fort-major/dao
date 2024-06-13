use candid::{CandidType, Principal};
use garde::Validate;
use icrc_ledger_types::icrc1::transfer::BlockIndex;
use serde::Deserialize;

use crate::e8s::E8s;

#[derive(CandidType, Deserialize, Validate, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum SwapFrom {
    Storypoint,
    Hour,
}

#[derive(CandidType, Deserialize, Validate, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum SwapInto {
    ICP,
    FMJ,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct SwapRequest {
    #[garde(skip)]
    pub storypoints: E8s,
    #[garde(skip)]
    pub hours: E8s,
    #[garde(dive)]
    pub into: SwapInto,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct SwapResponse {
    #[garde(skip)]
    pub asset: Principal,
    #[garde(skip)]
    pub block_idx: BlockIndex,
    #[garde(skip)]
    pub qty: E8s,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct InitRequest {
    #[garde(skip)]
    pub rewards_canister_id: Principal,
    #[garde(skip)]
    pub fmj_canister_id: Principal,
    #[garde(skip)]
    pub icp_canister_id: Principal,

    // rates are expressed as how much <into> one gets for 1.00 <from>
    #[garde(length(min = 1))]
    pub exchange_rates: Vec<(SwapFrom, SwapInto, E8s)>,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct GetExchangeRatesResponse {
    // rates are expressed as how much <into> one gets for 1.00 <from>
    #[garde(skip)]
    pub exchange_rates: Vec<(SwapFrom, SwapInto, E8s)>,
}
