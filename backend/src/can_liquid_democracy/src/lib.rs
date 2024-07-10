use std::cell::RefCell;

use ic_cdk::{
    api::time,
    caller, export_candid, init, post_upgrade, pre_upgrade, query,
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

#[init]
fn init_hook() {
    let state = create_state();

    install_state(Some(state));
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    let state = install_state(None);

    stable_save((state,)).expect("Unable to stable save");
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (state,): (Option<LiquidDemocracyState>,) =
        stable_restore().expect("Unable to stable restore");

    install_state(state);
}

thread_local! {
    static STATE: RefCell<Option<LiquidDemocracyState>> = RefCell::default();
}

pub fn create_state() -> LiquidDemocracyState {
    LiquidDemocracyState::new()
}

pub fn install_state(new_state: Option<LiquidDemocracyState>) -> Option<LiquidDemocracyState> {
    STATE.replace(new_state)
}

fn with_state<R, F: FnOnce(&LiquidDemocracyState) -> R>(f: F) -> R {
    STATE.with(|s| {
        let state_ref = s.borrow();
        let state = state_ref.as_ref().expect("State is not initialized");

        f(state)
    })
}

fn with_state_mut<R, F: FnOnce(&mut LiquidDemocracyState) -> R>(f: F) -> R {
    STATE.with(|s| {
        let mut state_ref = s.borrow_mut();
        let state = state_ref.as_mut().expect("State is not initialized");

        f(state)
    })
}

export_candid!();
