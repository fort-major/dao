use std::collections::BTreeMap;

use candid::{CandidType, Nat, Principal};
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};
use serde::Deserialize;

use crate::{
    btreemap, e8s::E8s, humans::api::SpendRewardsRequest, icrc1::ICRC1CanisterClient, TimestampNs,
};

use super::{
    api::{
        GetExchangeRatesRequest, GetExchangeRatesResponse, SetExchangeRateRequest,
        SetExchangeRateResponse, SwapRewardsRequest,
    },
    types::{SwapFrom, SwapInto},
};

#[derive(CandidType, Deserialize, Clone)]
pub struct BankState {
    pub fmj_canister_id: Principal,
    pub icp_canister_id: Principal,

    // rates are expressed as how much <into> one gets for 1.00 <from>
    pub exchange_rates: BTreeMap<(SwapFrom, SwapInto), E8s>,
}

impl BankState {
    pub fn new(fmj_canister_id: Principal, icp_canister_id: Principal) -> Self {
        let exchange_rates = btreemap! {
            (SwapFrom::Storypoint, SwapInto::FMJ) => E8s(Nat::from(10000_0000_0000u64)),
            (SwapFrom::Storypoint, SwapInto::ICP) => E8s(Nat::from(1_0000_0000u64)),
            (SwapFrom::Hour, SwapInto::FMJ) => E8s(Nat::from(10000_0000_0000u64)),
            (SwapFrom::Hour, SwapInto::ICP) => E8s(Nat::from(1_0000_0000u64)),
        };

        Self {
            fmj_canister_id,
            icp_canister_id,

            exchange_rates,
        }
    }

    pub fn prepare_swap_data(
        &self,
        req: &SwapRewardsRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> (SpendRewardsRequest, ICRC1CanisterClient, TransferArg) {
        let (hours, storypoints) = match &req.from {
            SwapFrom::Hour => (req.qty.clone(), E8s::zero()),
            SwapFrom::Storypoint => (E8s::zero(), req.qty.clone()),
        };

        let spend_request = SpendRewardsRequest {
            spender: caller,
            hours,
            storypoints,
        };

        let exchange_rate = self
            .exchange_rates
            .get(&(req.from, req.into))
            .cloned()
            .unwrap();

        let qty = &req.qty * exchange_rate;

        let canister_id = match req.into {
            SwapInto::ICP => self.icp_canister_id,
            SwapInto::FMJ => self.fmj_canister_id,
        };

        let icrc1_client = ICRC1CanisterClient::new(canister_id);
        let arg = TransferArg {
            to: Account {
                owner: caller,
                subaccount: None,
            },
            amount: qty.0,
            created_at_time: Some(now),
            from_subaccount: None,
            memo: None,
            fee: None,
        };

        (spend_request, icrc1_client, arg)
    }

    pub fn set_exchange_rate(&mut self, req: SetExchangeRateRequest) -> SetExchangeRateResponse {
        self.exchange_rates.insert((req.from, req.into), req.rate);

        SetExchangeRateResponse {}
    }

    pub fn get_exchange_rates(&self, req: GetExchangeRatesRequest) -> GetExchangeRatesResponse {
        let mut exchange_rates = Vec::new();

        for ((from, into), qty) in &self.exchange_rates {
            exchange_rates.push((from.clone(), into.clone(), qty.clone()));
        }

        GetExchangeRatesResponse { exchange_rates }
    }
}
