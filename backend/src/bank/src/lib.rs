use std::cell::RefCell;

use ic_cdk::{
    caller, init, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    update,
};
use shared::{
    bank::{GetExchangeRatesResponse, InitRequest, SwapRequest, SwapResponse},
    rewards::{RefundRequest, RewardsCanisterClient},
};
use state::{complete_swap, State};

mod state;

thread_local! {
    static STATE: RefCell<Option<State>> = RefCell::default();
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    let state = STATE.replace(Option::None);

    stable_save((state,)).expect("Unable to stable save");
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (state,): (Option<State>,) = stable_restore().expect("Unable to stable restore");

    STATE.replace(state);
}

#[init]
fn init_hook(req: InitRequest) {
    let state = State::new(req);

    STATE.replace(Some(state));
}

#[update]
async fn swap(req: SwapRequest) -> SwapResponse {
    // prepare the request to spend caller's rewards
    let (spend_req, rewards_canister_id) = STATE.with(|s| {
        let state_opt_ref = s.borrow();
        let state_ref = state_opt_ref.as_ref().unwrap();

        let spend_req = state_ref
            .prepare_spend(req.clone(), caller())
            .expect("Unable to prepare spend");

        (spend_req, state_ref.rewards_canister_id)
    });

    // spend the rewards
    let rewards_canister = RewardsCanisterClient::new(rewards_canister_id);
    rewards_canister
        .spend(spend_req.clone())
        .await
        .expect("Unable to spend rewards");

    // prepare the request to issue icp or fmj
    let (into, canister_id, qty) = STATE.with(|s| {
        let state_ref = s.borrow();
        state_ref.as_ref().unwrap().prepare_issue(req)
    });

    // issue icp or fmj
    let swap_result = complete_swap(into, canister_id, qty, caller()).await;

    match swap_result {
        // if not successfull - try refunding the spent rewards
        Err(reason) => {
            let refund_req = RefundRequest {
                id: spend_req.id,
                storypoints_e8s: spend_req.storypoints_e8s,
                hours_e8s: spend_req.hours_e8s,
            };

            rewards_canister.refund(refund_req).await.expect(
                "FATAL: UNABLE TO ISSUE AND UNABLE TO REFUND, COPY THIS ERROR AND TELL THE DEVS!",
            );

            panic!(
                "Unable to issue, your rewards were refunded, reason = {}",
                reason
            );
        }
        // if all good - return the swap response
        Ok(response) => response,
    }
}

#[query]
fn get_exchange_rates() -> GetExchangeRatesResponse {
    STATE.with(|s| {
        let state_ref = s.borrow();

        state_ref.as_ref().unwrap().get_exchange_rates()
    })
}
