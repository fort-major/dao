use std::cell::RefCell;

use candid::Principal;
use ic_cdk::{api::time, caller, query, trap, update};
use shared::{
    bank::{
        api::{
            GetExchangeRatesRequest, GetExchangeRatesResponse, SetExchangeRateRequest,
            SetExchangeRateResponse, SwapRewardsRequest, SwapRewardsResponse,
        },
        state::BankState,
    },
    e8s::E8s,
    humans::{api::RefundRewardsRequest, client::HumansCanisterClient},
    Guard,
};

use crate::canister_ids::{create_guard_context, get_canister_ids};

thread_local! {
    static BANK_STATE: RefCell<Option<BankState>> = RefCell::default();
}

pub fn create_bank_state(fmj_canister_id: Principal, icp_canister_id: Principal) -> BankState {
    BankState::new(fmj_canister_id, icp_canister_id)
}

pub fn install_bank_state(new_state: Option<BankState>) -> Option<BankState> {
    BANK_STATE.replace(new_state)
}

#[update]
#[allow(non_snake_case)]
async fn bank__set_exchange_rate(mut req: SetExchangeRateRequest) -> SetExchangeRateResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to set exchange rate");
    });

    with_state_mut(|s| s.set_exchange_rate(req))
}

#[update]
#[allow(non_snake_case)]
async fn bank__swap_rewards(mut req: SwapRewardsRequest) -> SwapRewardsResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to set exchange rate");
    });

    let (spend_req, icrc1_client, transfer_arg) =
        with_state_mut(|s| s.prepare_swap_data(&req, caller(), time()));

    let humans_canister = HumansCanisterClient::new(get_canister_ids().humans_canister_id);

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
                return SwapRewardsResponse {
                    asset: icrc1_client.canister_id,
                    block_idx,
                    qty,
                }
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
async fn bank__get_exchange_rates(mut req: GetExchangeRatesRequest) -> GetExchangeRatesResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to get exchange rate")
    });

    with_state(|s| s.get_exchange_rates(req))
}

fn with_state<R, F: FnOnce(&BankState) -> R>(f: F) -> R {
    BANK_STATE.with(|s| {
        let state_ref = s.borrow();
        let state = state_ref.as_ref().expect("Bank state is not initialized");

        f(state)
    })
}

fn with_state_mut<R, F: FnOnce(&mut BankState) -> R>(f: F) -> R {
    BANK_STATE.with(|s| {
        let mut state_ref = s.borrow_mut();
        let state = state_ref.as_mut().expect("Bank state is not initialized");

        f(state)
    })
}
