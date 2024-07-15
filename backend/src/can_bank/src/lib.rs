use std::{
    cell::RefCell,
    collections::{BTreeMap, LinkedList},
};

use candid::{Nat, Principal};
use ic_cdk::{
    api::time,
    caller, export_candid, init, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    trap, update,
};
use shared::{
    bank::{
        api::{
            GetExchangeRatesRequest, GetExchangeRatesResponse, GetFmjStatsRequest,
            GetFmjStatsResponse, SetExchangeRateRequest, SetExchangeRateResponse,
            SwapRewardsRequest, SwapRewardsResponse,
        },
        state::BankState,
        types::{SwapFrom, SwapInto},
    },
    btreemap,
    e8s::E8s,
    humans::{api::RefundRewardsRequest, client::HumansCanisterClient},
    Guard, ENV_VARS,
};

#[init]
fn init_hook() {
    with_state_mut(|s| {
        s.fmj_canister_id = ENV_VARS.fmj_canister_id;
        s.icp_canister_id = ENV_VARS.icp_canister_id;

        let now = time();

        let exchange_rates = btreemap! {
            (SwapFrom::Storypoint, SwapInto::FMJ) => LinkedList::from([(now, E8s(Nat::from(10000_0000_0000u64)))]),
            (SwapFrom::Storypoint, SwapInto::ICP) => LinkedList::from([(now, E8s(Nat::from(1_0000_0000u64)))]),
            (SwapFrom::Hour, SwapInto::FMJ) => LinkedList::from([(now, E8s(Nat::from(10000_0000_0000u64)))]),
            (SwapFrom::Hour, SwapInto::ICP) => LinkedList::from([(now, E8s(Nat::from(1_0000_0000u64)))]),
        };

        s.exchange_rates = exchange_rates;
    });
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    with_state(|s| stable_save((s,)).expect("Unable to stable save"));
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (bank_state,): (BankState,) = stable_restore().expect("Unable to stable restore");

    with_state_mut(|s| *s = bank_state);
}

#[update]
#[allow(non_snake_case)]
fn bank__set_exchange_rate(mut req: SetExchangeRateRequest) -> SetExchangeRateResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to set exchange rate");

        s.update_exchange_rate(req, time())
    })
}

#[update]
#[allow(non_snake_case)]
async fn bank__swap_rewards(mut req: SwapRewardsRequest) -> SwapRewardsResponse {
    let (spend_req, icrc1_client, transfer_arg) = with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to set exchange rate");

        s.prepare_swap_data(&req, caller(), time())
    });

    let humans_canister = HumansCanisterClient::new(ENV_VARS.humans_canister_id);

    if let Err((code, msg)) = humans_canister
        .humans__spend_rewards(spend_req.clone())
        .await
    {
        trap(&format!("Unable to spend rewards: [{:?}] {}", code, msg));
    }

    let qty = E8s(transfer_arg.amount.clone());

    let err = match icrc1_client.icrc1_transfer(transfer_arg).await {
        Err((code, msg)) => format!("Bad swap, rewards refunded: [{:?}] {}", code, msg),
        Ok((res,)) => match res {
            Err(e) => format!("Bad swap, rewards refunded: {}", e),
            Ok(block_idx) => {
                if matches!(req.into, SwapInto::FMJ) {
                    with_state_mut(|s| s.update_fmj_stats(qty.clone(), time()));
                }

                return SwapRewardsResponse {
                    asset: icrc1_client.canister_id,
                    block_idx,
                    qty,
                };
            }
        },
    };

    let refund_req = RefundRewardsRequest {
        spender: spend_req.spender,
        hours: spend_req.hours,
        storypoints: spend_req.storypoints,
    };

    // TODO: add rescheduling
    if let Err((code, msg)) = humans_canister.humans__refund_rewards(refund_req).await {
        trap(&format!(
            "FATAL!!! Unable to refund rewards: [{:?}] {}",
            code, msg
        ));
    }

    trap(&err);
}

#[query]
#[allow(non_snake_case)]
fn bank__get_exchange_rates(mut req: GetExchangeRatesRequest) -> GetExchangeRatesResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get exchange rate");

        s.get_exchange_rates(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn bank__get_fmj_stats(mut req: GetFmjStatsRequest) -> GetFmjStatsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get FMJ stats");

        s.get_fmj_stats(req)
    })
}

thread_local! {
    static BANK_STATE: RefCell<BankState> = RefCell::new(BankState::new(Principal::management_canister(), Principal::management_canister()));
}

fn with_state<R, F: FnOnce(&BankState) -> R>(f: F) -> R {
    BANK_STATE.with(|s| {
        let state_ref = s.borrow();

        f(&state_ref)
    })
}

fn with_state_mut<R, F: FnOnce(&mut BankState) -> R>(f: F) -> R {
    BANK_STATE.with(|s| {
        let mut state_ref = s.borrow_mut();

        f(&mut state_ref)
    })
}

export_candid!();
