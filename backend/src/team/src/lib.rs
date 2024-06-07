use std::cell::RefCell;

use ic_cdk::{
    api::management_canister::main::{canister_status, CanisterIdRecord},
    caller, export_candid, id, init, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    update,
};
use shared::team::{
    EmployRequest, GetTeamMemberIdsResponse, GetTeamMembersRequest, GetTeamMembersResponse,
    InitRequest, UnemployRequest, UpdateWeeklyHourRateRequest,
};
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
    let state = State::new(req).expect("Unable to init");

    STATE.replace(Some(state));
}

#[update]
async fn employ(req: EmployRequest) {
    let (response,) = canister_status(CanisterIdRecord { canister_id: id() })
        .await
        .expect("Unable to call management canister");

    STATE.with(|s| {
        let mut state_ref = s.borrow_mut();

        state_ref
            .as_mut()
            .unwrap()
            .employ(req, caller(), response.settings.controllers)
            .expect("Unable to employ")
    })
}

#[update]
async fn unemploy(req: UnemployRequest) {
    let (response,) = canister_status(CanisterIdRecord { canister_id: id() })
        .await
        .expect("Unable to call management canister");

    STATE.with(|s| {
        let mut state_ref = s.borrow_mut();

        state_ref
            .as_mut()
            .unwrap()
            .unemploy(req, caller(), response.settings.controllers)
            .expect("Unable to employ")
    })
}

#[update]
async fn update_weekly_hour_rate(req: UpdateWeeklyHourRateRequest) {
    let (response,) = canister_status(CanisterIdRecord { canister_id: id() })
        .await
        .expect("Unable to call management canister");

    STATE.with(|s| {
        let mut state_ref = s.borrow_mut();

        state_ref
            .as_mut()
            .unwrap()
            .update_weekly_hour_rate(req, caller(), response.settings.controllers)
            .expect("Unable to employ")
    })
}

#[query]
fn get_team_member_ids() -> GetTeamMemberIdsResponse {
    STATE.with(|s| {
        let state_ref = s.borrow();

        state_ref.as_ref().unwrap().get_team_member_ids()
    })
}

#[query]
fn get_team_members(req: GetTeamMembersRequest) -> GetTeamMembersResponse {
    STATE.with(|s| {
        let state_ref = s.borrow();

        state_ref
            .as_ref()
            .unwrap()
            .get_team_members(req)
            .expect("Unable to get team members")
    })
}

export_candid!();
