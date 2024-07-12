use std::collections::{BTreeMap, LinkedList};

use candid::{CandidType, Nat, Principal};
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};
use serde::Deserialize;

use crate::{
    btreemap, e8s::E8s, humans::api::SpendRewardsRequest, icrc1::ICRC1CanisterClient,
    votings::types::ONE_MONTH_NS, TimestampNs,
};

use super::{
    api::{
        GetExchangeRatesRequest, GetExchangeRatesResponse, GetFmjStatsRequest, GetFmjStatsResponse,
        SetExchangeRateRequest, SetExchangeRateResponse, SwapRewardsRequest,
    },
    types::{SwapFrom, SwapInto},
};

#[derive(CandidType, Deserialize, Clone)]
pub struct BankState {
    pub fmj_canister_id: Principal,
    pub icp_canister_id: Principal,

    // rates are expressed as how much <into> one gets for 1.00 <from>
    pub exchange_rates: BTreeMap<(SwapFrom, SwapInto), LinkedList<(TimestampNs, E8s)>>,
    pub monthly_minted_fmj: LinkedList<(TimestampNs, E8s)>,
    pub fmj_total_supply: E8s,
}

impl BankState {
    pub fn new(fmj_canister_id: Principal, icp_canister_id: Principal, now: TimestampNs) -> Self {
        let exchange_rates = btreemap! {
            (SwapFrom::Storypoint, SwapInto::FMJ) => LinkedList::from([(now, E8s(Nat::from(10000_0000_0000u64)))]),
            (SwapFrom::Storypoint, SwapInto::ICP) => LinkedList::from([(now, E8s(Nat::from(1_0000_0000u64)))]),
            (SwapFrom::Hour, SwapInto::FMJ) => LinkedList::from([(now, E8s(Nat::from(10000_0000_0000u64)))]),
            (SwapFrom::Hour, SwapInto::ICP) => LinkedList::from([(now, E8s(Nat::from(1_0000_0000u64)))]),
        };

        Self {
            fmj_canister_id,
            icp_canister_id,

            exchange_rates,
            monthly_minted_fmj: LinkedList::new(),
            fmj_total_supply: E8s::zero(),
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

        let history = self
            .exchange_rates
            .get(&(req.from, req.into))
            .cloned()
            .unwrap();

        let (_, exchange_rate) = history.front().as_ref().unwrap();

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

    pub fn update_exchange_rate(
        &mut self,
        req: SetExchangeRateRequest,
        now: TimestampNs,
    ) -> SetExchangeRateResponse {
        let history = self.exchange_rates.get_mut(&(req.from, req.into)).unwrap();

        history.push_front((now, req.rate));

        SetExchangeRateResponse {}
    }

    pub fn get_exchange_rates(&self, _req: GetExchangeRatesRequest) -> GetExchangeRatesResponse {
        let mut exchange_rates = Vec::new();

        for ((from, into), history) in &self.exchange_rates {
            exchange_rates.push((
                from.clone(),
                into.clone(),
                history.iter().cloned().collect(),
            ));
        }

        GetExchangeRatesResponse { exchange_rates }
    }

    pub fn update_fmj_stats(&mut self, fmj_minted: E8s, now: TimestampNs) {
        self.fmj_total_supply += &fmj_minted;

        let mut needs_new_entry = false;

        if let Some((timestamp, qty)) = self.monthly_minted_fmj.back_mut() {
            if *timestamp + ONE_MONTH_NS <= now {
                needs_new_entry = true;
            } else {
                *qty += &fmj_minted;
            }
        } else {
            needs_new_entry = true;
        }

        if needs_new_entry {
            if self.monthly_minted_fmj.len() == 12 {
                self.monthly_minted_fmj.pop_front();
            }

            self.monthly_minted_fmj.push_back((now, fmj_minted));
        }
    }

    pub fn get_fmj_stats(&self, _req: GetFmjStatsRequest) -> GetFmjStatsResponse {
        let len = self.monthly_minted_fmj.len();

        if len == 0 {
            return GetFmjStatsResponse {
                total_supply: E8s::zero(),
                avg_monthly_inflation: E8s::zero(),
            };
        }

        let mut multiplier = E8s::f0_5();
        let divider = E8s::two();
        let mut avg = E8s::zero();

        for (idx, (_, qty)) in self.monthly_minted_fmj.iter().enumerate() {
            avg += qty * &multiplier;

            if idx == len - 1 {
                avg += qty * &multiplier;
            }

            multiplier /= &divider;
        }

        return GetFmjStatsResponse {
            total_supply: self.fmj_total_supply.clone(),
            avg_monthly_inflation: avg,
        };
    }
}
