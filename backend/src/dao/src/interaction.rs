use std::cell::RefCell;

use ic_cdk::{api::time, caller};
use shared::{
    humans::{
        api::{AreTeamMembersRequest, MintRewardsRequest},
        client::HumansCanisterClient,
    },
    tasks::tasks::RewardEntry,
    CanisterIds, GuardContext,
};

thread_local! {
    static CANISTER_IDS: RefCell<Option<CanisterIds>> = RefCell::default();
}

pub fn get_canister_ids() -> CanisterIds {
    CANISTER_IDS.with(|s| {
        s.borrow()
            .as_ref()
            .expect("Canister IDS state is not initialized")
            .clone()
    })
}

pub async fn caller_is_team_member() -> bool {
    HumansCanisterClient::new(get_canister_ids().humans_canister_id)
        .are_team_members(AreTeamMembersRequest {
            ids: vec![caller()],
        })
        .await
        .expect("Unable to call to humans canister")
        .results[0]
}

// TODO: make it retry the request
pub async fn mint_rewards(rewards: Vec<RewardEntry>) {
    HumansCanisterClient::new(get_canister_ids().humans_canister_id)
        .mint_rewards(MintRewardsRequest { rewards })
        .await
        .expect("Unable to call humans canister");
}

pub async fn create_guard_context() -> GuardContext {
    GuardContext::new(
        &get_canister_ids(),
        caller_is_team_member().await,
        caller(),
        time(),
    )
}
