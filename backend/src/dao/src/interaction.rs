use std::cell::RefCell;

use ic_cdk::{api::time, caller};
use shared::{
    humans::{
        api::{AreTeamMembersRequest, MintRewardsRequest},
        client::HumansCanisterClient,
        types::{RefundRequest, SpendRequest},
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

// TODO: make it retry the request
pub async fn mint_rewards(rewards: Vec<RewardEntry>) {
    HumansCanisterClient::new(get_canister_ids().humans_canister_id)
        .mint_rewards(MintRewardsRequest { rewards })
        .await
        .expect("Unable to call humans canister");
}

// TODO
pub async fn spend_rewards(req: SpendRequest) {}

// refund rewards
pub async fn refund_rewards(req: RefundRequest) {}

pub async fn create_guard_context() -> GuardContext {
    GuardContext::new(&get_canister_ids(), caller(), time())
}
