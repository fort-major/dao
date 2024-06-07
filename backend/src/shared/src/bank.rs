use std::collections::BTreeMap;

use candid::{CandidType, Nat, Principal};
use icrc_ledger_types::icrc1::transfer::BlockIndex;
use serde::Deserialize;

#[derive(CandidType, Deserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum SwapFrom {
    Storypoint,
    Hour,
}

#[derive(CandidType, Deserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum SwapInto {
    ICP,
    FMJ,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct SwapRequest {
    pub storypoints_e8s: Nat,
    pub hours_e8s: Nat,
    pub into: SwapInto,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct SwapResponse {
    pub asset: Principal,
    pub block_idx: BlockIndex,
    pub qty_e8s: Nat,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct InitRequest {
    pub rewards_canister_id: Principal,
    pub fmj_canister_id: Principal,
    pub icp_canister_id: Principal,

    // rates are expressed as how much <into> one gets for 1.00 <from>
    pub exchange_rates: Vec<(SwapFrom, SwapInto, Nat)>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct GetExchangeRatesResponse {
    // rates are expressed as how much <into> one gets for 1.00 <from>
    pub exchange_rates: Vec<(SwapFrom, SwapInto, Nat)>,
}
