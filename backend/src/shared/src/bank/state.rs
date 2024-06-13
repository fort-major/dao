use std::collections::BTreeMap;

use candid::{CandidType, Principal};
use ic_cdk::api::time;
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};
use serde::Deserialize;

use crate::{e8s::E8s, icrc1::ICRC1CanisterClient, rewards::BalanceEntry};

use super::api::{
    GetExchangeRatesResponse, InitRequest, SwapFrom, SwapInto, SwapRequest, SwapResponse,
};

#[derive(CandidType, Deserialize, Clone)]
pub struct State {
    pub rewards_canister_id: Principal,
    pub fmj_canister_id: Principal,
    pub icp_canister_id: Principal,

    // rates are expressed as how much <into> one gets for 1.00 <from>
    pub exchange_rates: BTreeMap<(SwapFrom, SwapInto), E8s>,
}

impl State {
    pub fn new(req: InitRequest) -> Self {
        let mut exchange_rates = BTreeMap::new();

        for (from, into, rate) in req.exchange_rates {
            exchange_rates.insert((from, into), rate);
        }

        Self {
            rewards_canister_id: req.rewards_canister_id,
            fmj_canister_id: req.fmj_canister_id,
            icp_canister_id: req.icp_canister_id,

            exchange_rates,
        }
    }

    pub fn get_exchange_rates(&self) -> GetExchangeRatesResponse {
        let mut exchange_rates = Vec::new();

        for ((from, into), qty) in &self.exchange_rates {
            exchange_rates.push((from.clone(), into.clone(), qty.clone()));
        }

        GetExchangeRatesResponse { exchange_rates }
    }

    pub fn prepare_spend(
        &self,
        req: SwapRequest,
        caller: Principal,
    ) -> Result<BalanceEntry, String> {
        let zero = E8s::zero();

        if req.storypoints == zero && req.hours == zero {
            return Err(format!("Empty swap request"));
        }

        let spend_request = BalanceEntry {
            id: caller,
            hours: req.hours.clone(),
            storypoints: req.storypoints.clone(),
        };

        Ok(spend_request)
    }

    pub fn prepare_issue(&self, req: SwapRequest) -> (Principal, E8s) {
        match req.into {
            SwapInto::ICP => {
                let exchange_rate_storypoints = self
                    .exchange_rates
                    .get(&(SwapFrom::Storypoint, SwapInto::ICP))
                    .cloned()
                    .unwrap();
                let exchange_rate_hours = self
                    .exchange_rates
                    .get(&(SwapFrom::Hour, SwapInto::ICP))
                    .cloned()
                    .unwrap();

                let total_icp =
                    req.hours * exchange_rate_hours + req.storypoints * exchange_rate_storypoints;

                (self.icp_canister_id, total_icp)
            }
            SwapInto::FMJ => {
                let exchange_rate_storypoints = self
                    .exchange_rates
                    .get(&(SwapFrom::Storypoint, SwapInto::FMJ))
                    .cloned()
                    .unwrap();

                let exchange_rate_hours = self
                    .exchange_rates
                    .get(&(SwapFrom::Hour, SwapInto::FMJ))
                    .cloned()
                    .unwrap();

                let total_fmj =
                    req.hours * exchange_rate_hours + req.storypoints * exchange_rate_storypoints;

                (self.fmj_canister_id, total_fmj)
            }
        }
    }
}

pub async fn complete_swap(
    canister_id: Principal,
    qty: E8s,
    caller: Principal,
) -> Result<SwapResponse, String> {
    let icrc1_canister = ICRC1CanisterClient::new(canister_id);
    let arg = TransferArg {
        to: Account {
            owner: caller,
            subaccount: None,
        },
        amount: qty.clone().0,
        created_at_time: Some(time()),
        from_subaccount: None,
        memo: None,
        fee: None,
    };

    let (result,) = icrc1_canister
        .icrc1_transfer(arg)
        .await
        .map_err(|(code, err)| format!("Unable to transfer ICP: code: {:?}, msg: {}", code, err))?;

    let block_idx = result.map_err(|e| format!("Unable to transfer ICP: {}", e))?;

    Ok(SwapResponse {
        asset: canister_id,
        block_idx,
        qty,
    })
}
