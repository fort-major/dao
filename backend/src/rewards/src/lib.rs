use std::cell::RefCell;

use ic_cdk::{
    caller, export_candid, init, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    update,
};
use shared::rewards::{GetInfoRequest, GetInfoResponse, InitRequest, MintRequest, SpendRequest};
use state::State;

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
fn mint(req: MintRequest) {
    STATE.with(|s| {
        let mut state_ref = s.borrow_mut();

        state_ref
            .as_mut()
            .unwrap()
            .mint(req, caller())
            .expect("Unable to mint")
    })
}

#[update]
fn spend(req: SpendRequest) {
    STATE.with(|s| {
        let mut state_ref = s.borrow_mut();

        state_ref
            .as_mut()
            .unwrap()
            .spend(req, caller())
            .expect("Unable to spend")
    })
}

#[query]
fn get_info_of(req: GetInfoRequest) -> GetInfoResponse {
    STATE.with(|s| {
        let state_ref = s.borrow();

        state_ref.as_ref().unwrap().get_info_of(req)
    })
}

export_candid!();
