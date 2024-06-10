use std::collections::BTreeMap;

use candid::{CandidType, Nat, Principal};
use ic_cdk::api::time;
use icrc_ledger_types::icrc1::{account::Account, transfer::TransferArg};
use serde::Deserialize;
use shared::{
    bank::{GetExchangeRatesResponse, InitRequest, SwapFrom, SwapInto, SwapRequest, SwapResponse},
    icrc1::ICRC1CanisterClient,
    rewards::{BalanceEntry, RewardsCanisterClient},
};

#[derive(CandidType, Deserialize, Clone)]
pub struct State {
    pub rewards_canister_id: Principal,
    pub fmj_canister_id: Principal,
    pub icp_canister_id: Principal,

    // rates are expressed as how much <into> one gets for 1.00 <from>
    pub exchange_rates: BTreeMap<(SwapFrom, SwapInto), Nat>,
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
        let zero = Nat::from(0u32);
        if req.storypoints_e8s == zero && req.hours_e8s == zero {
            return Err(format!("Empty swap request"));
        }

        let spend_request = BalanceEntry {
            id: caller,
            hours_e8s: req.hours_e8s.clone(),
            storypoints_e8s: req.storypoints_e8s.clone(),
        };

        Ok(spend_request)
    }

    pub fn prepare_issue(&self, req: SwapRequest) -> (Principal, Nat) {
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

                let total_icp = req.hours_e8s * exchange_rate_hours
                    + req.storypoints_e8s * exchange_rate_storypoints;

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

                let total_fmj = req.hours_e8s * exchange_rate_hours
                    + req.storypoints_e8s * exchange_rate_storypoints;

                (self.fmj_canister_id, total_fmj)
            }
        }
    }
}

pub async fn complete_swap(
    canister_id: Principal,
    qty: Nat,
    caller: Principal,
) -> Result<SwapResponse, String> {
    let icrc1_canister = ICRC1CanisterClient::new(canister_id);
    let arg = TransferArg {
        to: Account {
            owner: caller,
            subaccount: None,
        },
        amount: qty.clone(),
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
        qty_e8s: qty,
    })
}
