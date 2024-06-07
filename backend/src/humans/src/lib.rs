use std::cell::RefCell;

use ic_cdk::{
    caller, export_candid, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    update,
};
use shared::humans::{GetProfilesRequest, GetProfilesResponse, RegisterOrUpdateRequest};
use state::State;

mod state;

// TODO: make register and update-profile require PoW

thread_local! {
    static STATE: RefCell<State> = RefCell::default();
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    let state = STATE.replace(State::default());

    stable_save((state,)).expect("Unable to stable save");
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (state,): (State,) = stable_restore().expect("Unable to stable restore");

    STATE.replace(state);
}

#[query]
fn get_profiles(req: GetProfilesRequest) -> GetProfilesResponse {
    STATE
        .with(|s| s.borrow().get_profiles(req))
        .expect("Unable to get profiles")
}

#[update]
fn register(req: RegisterOrUpdateRequest) {
    STATE
        .with(|s| s.borrow_mut().register(req, caller()))
        .expect("Unable to register");
}

#[update]
fn update_profile(req: RegisterOrUpdateRequest) {
    STATE
        .with(|s| s.borrow_mut().update_profile(req, caller()))
        .expect("Unable to update the profile")
}

export_candid!();
