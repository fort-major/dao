use std::cell::RefCell;

use ic_cdk::{
    api::time,
    caller, export_candid, init, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    update,
};
use shared::{
    humans::{
        api::{
            EditProfileRequest, EditProfileResponse, EmployRequest, EmployResponse,
            GetProfileIdsRequest, GetProfileIdsResponse, GetProfileProofsRequest,
            GetProfileProofsResponse, GetProfilesRequest, GetProfilesResponse, GetTotalsRequest,
            GetTotalsResponse, MintRewardsRequest, MintRewardsResponse, RefundRewardsRequest,
            RefundRewardsResponse, RegisterRequest, RegisterResponse, SpendRewardsRequest,
            SpendRewardsResponse, UnemployRequest, UnemployResponse,
        },
        state::HumansState,
    },
    Guard,
};

#[init]
fn init_hook() {
    let humans_state = create_humans_state();

    install_humans_state(Some(humans_state));
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    let humans_state = install_humans_state(None);

    stable_save((humans_state,)).expect("Unable to stable save");
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (humans_state,): (Option<HumansState>,) =
        stable_restore().expect("Unable to stable restore");

    install_humans_state(humans_state);
}

#[update]
#[allow(non_snake_case)]
fn humans__register(mut req: RegisterRequest) -> RegisterResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to register new profile");

        s.register(req, caller(), time())
    })
}

#[update]
#[allow(non_snake_case)]
fn humans__edit_profile(mut req: EditProfileRequest) -> EditProfileResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to edit profile");

        s.edit_profile(req, caller())
    })
}

#[update]
#[allow(non_snake_case)]
fn humans__mint_rewards(mut req: MintRewardsRequest) -> MintRewardsResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to mint rewards");

        s.mint_rewards(req)
    })
}

#[update]
#[allow(non_snake_case)]
fn humans__spend_rewards(mut req: SpendRewardsRequest) -> SpendRewardsResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to spend rewards");

        s.spend_rewards(req)
    })
}

#[update]
#[allow(non_snake_case)]
fn humans__refund_rewards(mut req: RefundRewardsRequest) -> RefundRewardsResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to refund rewards");

        s.refund_rewards(req)
    })
}

#[update]
#[allow(non_snake_case)]
fn humans__employ(mut req: EmployRequest) -> EmployResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to employ");

        s.employ(req, time())
    })
}

#[update]
#[allow(non_snake_case)]
fn humans__unemploy(mut req: UnemployRequest) -> UnemployResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to refund rewards");

        s.unemploy(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn humans__get_profiles(mut req: GetProfilesRequest) -> GetProfilesResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get profiles");

        s.get_profiles(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn humans__get_profile_ids(mut req: GetProfileIdsRequest) -> GetProfileIdsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get profile ids");

        s.get_profile_ids(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn humans__get_totals(mut req: GetTotalsRequest) -> GetTotalsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get totals");

        s.get_totals(req)
    })
}

#[update]
#[allow(non_snake_case)]
fn humans__get_profile_proofs(mut req: GetProfileProofsRequest) -> GetProfileProofsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get profile proofs");

        s.get_profile_proofs(req, caller())
    })
}

#[update]
fn humans__init_once() {
    with_state_mut(|s| s.init(caller(), time()));
}

thread_local! {
    static HUMANS_STATE: RefCell<Option<HumansState>> = RefCell::default();
}

pub fn create_humans_state() -> HumansState {
    HumansState::default()
}

pub fn install_humans_state(new_state: Option<HumansState>) -> Option<HumansState> {
    HUMANS_STATE.replace(new_state)
}

fn with_state<R, F: FnOnce(&HumansState) -> R>(f: F) -> R {
    HUMANS_STATE.with(|s| {
        let state_ref = s.borrow();
        let state = state_ref.as_ref().expect("Humans state is not initialized");

        f(state)
    })
}

fn with_state_mut<R, F: FnOnce(&mut HumansState) -> R>(f: F) -> R {
    HUMANS_STATE.with(|s| {
        let mut state_ref = s.borrow_mut();
        let state = state_ref.as_mut().expect("Humans state is not initialized");

        f(state)
    })
}

export_candid!();
