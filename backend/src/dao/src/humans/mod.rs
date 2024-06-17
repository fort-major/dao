use std::cell::RefCell;

use candid::Principal;
use ic_cdk::{api::time, caller, query, update};
use shared::{
    humans::{
        api::{
            EditProfileRequest, EditProfileResponse, EmployRequest, EmployResponse,
            GetProfileIdsRequest, GetProfileIdsResponse, GetProfileProofsRequest,
            GetProfileProofsResponse, GetProfilesRequest, GetProfilesResponse, MintRewardsRequest,
            MintRewardsResponse, RefundRewardsRequest, RefundRewardsResponse, RegisterRequest,
            RegisterResponse, SpendRewardsRequest, SpendRewardsResponse, UnemployRequest,
            UnemployResponse,
        },
        state::HumansState,
    },
    Guard, TimestampNs,
};

use crate::canister_ids::create_guard_context;

thread_local! {
    static HUMANS_STATE: RefCell<Option<HumansState>> = RefCell::default();
}

pub fn create_humans_state(sasha: Principal, now: TimestampNs) -> HumansState {
    HumansState::new(sasha, now)
}

pub fn install_humans_state(new_state: Option<HumansState>) -> Option<HumansState> {
    HUMANS_STATE.replace(new_state)
}

#[update]
#[allow(non_snake_case)]
async fn humans__register(mut req: RegisterRequest) -> RegisterResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to register new profile");
    });

    with_state_mut(|s| s.register(req, caller(), time()))
}

#[update]
#[allow(non_snake_case)]
async fn humans__edit_profile(mut req: EditProfileRequest) -> EditProfileResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to edit profile");
    });

    with_state_mut(|s| s.edit_profile(req, caller()))
}

#[update]
#[allow(non_snake_case)]
async fn humans__mint_rewards(mut req: MintRewardsRequest) -> MintRewardsResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to mint rewards");
    });

    with_state_mut(|s| s.mint_rewards(req))
}

#[update]
#[allow(non_snake_case)]
async fn humans__spend_rewards(mut req: SpendRewardsRequest) -> SpendRewardsResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to spend rewards");
    });

    with_state_mut(|s| s.spend_rewards(req))
}

#[update]
#[allow(non_snake_case)]
async fn humans__refund_rewards(mut req: RefundRewardsRequest) -> RefundRewardsResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to refund rewards");
    });

    with_state_mut(|s| s.refund_rewards(req))
}

#[update]
#[allow(non_snake_case)]
async fn humans__employ(mut req: EmployRequest) -> EmployResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to employ");
    });

    with_state_mut(|s| s.employ(req, time()))
}

#[update]
#[allow(non_snake_case)]
async fn humans__unemploy(mut req: UnemployRequest) -> UnemployResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to refund rewards");
    });

    with_state_mut(|s| s.unemploy(req))
}

#[query]
#[allow(non_snake_case)]
async fn humans__get_profiles(mut req: GetProfilesRequest) -> GetProfilesResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to get profiles");
    });

    with_state(|s| s.get_profiles(req))
}

#[query]
#[allow(non_snake_case)]
async fn humans__get_profile_ids(mut req: GetProfileIdsRequest) -> GetProfileIdsResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to get profile ids");
    });

    with_state(|s| s.get_profile_ids(req))
}

#[query]
#[allow(non_snake_case)]
async fn humans__get_team_member_ids(mut req: GetProfileIdsRequest) -> GetProfileIdsResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to get team member ids");
    });

    with_state(|s| s.get_team_member_ids(req))
}

#[update]
#[allow(non_snake_case)]
async fn humans__get_profile_proofs(mut req: GetProfileProofsRequest) -> GetProfileProofsResponse {
    let ctx = create_guard_context();

    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .await
            .expect("Unable to get profile proofs");
    });

    with_state(|s| s.get_profile_proofs(req, caller()))
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
