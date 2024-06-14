use std::cell::RefCell;

use ic_cdk::{api::time, caller};
use shared::{CanisterIds, GuardContext};

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

pub fn create_guard_context() -> GuardContext {
    GuardContext::new(&get_canister_ids(), caller(), time())
}
