use std::cell::RefCell;

use candid::Principal;
use ic_cdk::{api::time, caller};
use shared::{CanisterIds, ExecutionContext};

thread_local! {
    static CANISTER_IDS_STATE: RefCell<Option<CanisterIds>> = RefCell::default();
}

pub fn create_canister_ids_state(
    humans_canister_id: Principal,
    votings_canister_id: Principal,
    tasks_canister_id: Principal,
    bank_canister_id: Principal,
) -> CanisterIds {
    CanisterIds {
        humans_canister_id,
        votings_canister_id,
        tasks_canister_id,
        bank_canister_id,
    }
}

pub fn install_canister_ids_state(new_state: Option<CanisterIds>) -> Option<CanisterIds> {
    CANISTER_IDS_STATE.replace(new_state)
}

pub fn get_canister_ids() -> CanisterIds {
    CANISTER_IDS_STATE.with(|s| {
        s.borrow()
            .as_ref()
            .expect("Canister IDS state is not initialized")
            .clone()
    })
}

pub fn create_exec_context() -> ExecutionContext {
    ExecutionContext::new(&get_canister_ids(), caller(), time())
}
