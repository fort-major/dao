use std::cell::RefCell;

use ic_cdk::{
    api::time,
    caller, export_candid, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    update,
};
use shared::{
    liquid_democracy::{
        api::{
            FollowRequest, FollowResponse, GetDecisionTopicsRequest, GetDecisionTopicsResponse,
            GetFolloweesOfRequest, GetFolloweesOfResponse, GetFollowersOfRequest,
            GetFollowersOfResponse, GetLiquidDemocracyProofRequest,
            GetLiquidDemocracyProofResponse,
        },
        state::LiquidDemocracyState,
    },
    Guard,
};

#[update]
#[allow(non_snake_case)]
fn liquid_democracy__follow(mut req: FollowRequest) -> FollowResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to follow");

        s.follow(req, caller())
    })
}

#[query]
#[allow(non_snake_case)]
fn liquid_democracy__get_followers_of(mut req: GetFollowersOfRequest) -> GetFollowersOfResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get followers of");

        s.get_followers_of(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn liquid_democracy__get_followees_of(mut req: GetFolloweesOfRequest) -> GetFolloweesOfResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get followees of");

        s.get_followees_of(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn liquid_democracy__get_decision_topics(
    mut req: GetDecisionTopicsRequest,
) -> GetDecisionTopicsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get decision topics");

        s.get_decision_topics(req)
    })
}

#[update]
#[allow(non_snake_case)]
fn liquid_democracy__get_liquid_democracy_proof(
    mut req: GetLiquidDemocracyProofRequest,
) -> GetLiquidDemocracyProofResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get proof");

        s.get_liquid_democracy_proof(req, caller())
    })
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    with_state(|s| stable_save((s,)).expect("Unable to stable save"));
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (state,): (LiquidDemocracyState,) = stable_restore().expect("Unable to stable restore");

    with_state_mut(|s| *s = state);
}

thread_local! {
    static STATE: RefCell<LiquidDemocracyState> = RefCell::new(LiquidDemocracyState::new());
}

fn with_state<R, F: FnOnce(&LiquidDemocracyState) -> R>(f: F) -> R {
    STATE.with(|s| {
        let state_ref = s.borrow();

        f(&state_ref)
    })
}

fn with_state_mut<R, F: FnOnce(&mut LiquidDemocracyState) -> R>(f: F) -> R {
    STATE.with(|s| {
        let mut state_ref = s.borrow_mut();

        f(&mut state_ref)
    })
}

export_candid!();
