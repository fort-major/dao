use std::cell::RefCell;

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::{
    api::time,
    caller, export_candid, init, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    trap, update,
};
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
    CanisterIds, Guard,
};
use utils::install_canister_ids_state;

mod utils;

use crate::utils::{create_exec_context, get_canister_ids};

#[derive(CandidType, Deserialize)]
pub struct InitRequest {
    pub fmj_canister_id: Principal,
    pub icp_canister_id: Principal,
    pub dao_canister_ids: CanisterIds,
}

#[init]
fn init_hook(req: InitRequest) {
    let bank_state = create_bank_state(req.fmj_canister_id, req.icp_canister_id);

    install_bank_state(Some(bank_state));
    install_canister_ids_state(Some(req.dao_canister_ids));
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    let bank_state = install_bank_state(None);
    let canister_ids_state = install_canister_ids_state(None);

    stable_save((bank_state, canister_ids_state)).expect("Unable to stable save");
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (bank_state, canister_ids_state): (Option<BankState>, Option<CanisterIds>) =
        stable_restore().expect("Unable to stable restore");

    install_bank_state(bank_state);
    install_canister_ids_state(canister_ids_state);
}

#[update]
#[allow(non_snake_case)]
fn bank__set_exchange_rate(mut req: SetExchangeRateRequest) -> SetExchangeRateResponse {
    let ctx = create_exec_context();

    with_state_mut(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to set exchange rate");

        s.set_exchange_rate(req)
    })
}

#[update]
#[allow(non_snake_case)]
async fn bank__swap_rewards(mut req: SwapRewardsRequest) -> SwapRewardsResponse {
    let ctx = create_exec_context();

    let (spend_req, icrc1_client, transfer_arg) = with_state_mut(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to set exchange rate");

        s.prepare_swap_data(&req, caller(), time())
    });

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
fn bank__get_exchange_rates(mut req: GetExchangeRatesRequest) -> GetExchangeRatesResponse {
    let ctx = create_exec_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to get exchange rate");

        s.get_exchange_rates(req)
    })
}

thread_local! {
    static BANK_STATE: RefCell<Option<BankState>> = RefCell::default();
}

pub fn create_bank_state(fmj_canister_id: Principal, icp_canister_id: Principal) -> BankState {
    BankState::new(fmj_canister_id, icp_canister_id)
}

pub fn install_bank_state(new_state: Option<BankState>) -> Option<BankState> {
    BANK_STATE.replace(new_state)
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

export_candid!();
