use ic_cdk::api::time;
use ic_cdk::{caller, export_candid, init, post_upgrade, query, update};
use ic_cdk_timers::set_timer;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager};
use ic_stable_structures::{Cell, DefaultMemoryImpl, StableBTreeMap};
use shared::e8s::E8s;
use shared::reputation::api::{
    GetBalanceRequest, GetBalanceResponse, GetRepProofRequest, GetRepProofResponse,
    GetTotalSupplyRequest, GetTotalSupplyResponse, MintRepRequest, MintRepResponse,
};
use shared::reputation::state::ReputationState;
use shared::votings::types::ONE_MONTH_NS;
use shared::Guard;
use std::cell::RefCell;
use std::time::Duration;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static STATE: RefCell<ReputationState> = RefCell::new(
        ReputationState {
            balances: StableBTreeMap::init(
                MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))),
            ),
            total_supply: Cell::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1))), E8s::zero()).expect("Unable to create total supply cell"),
            decay_start_key: Cell::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2))), None).expect("Unable to create decay start key cell"),
            initialized: Cell::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))), false).expect("Unable to store the initialized flag"),
        }
    )
}

#[update]
#[allow(non_snake_case)]
fn reputation__mint(mut req: MintRepRequest) -> MintRepResponse {
    with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to mint rep");

        s.mint(req, time())
    })
}

#[query]
#[allow(non_snake_case)]
fn reputation__get_balance(mut req: GetBalanceRequest) -> GetBalanceResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get rep");

        s.get_balances(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn reputation__get_total_supply(mut req: GetTotalSupplyRequest) -> GetTotalSupplyResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get total rep supply");

        s.get_total_supply(req)
    })
}

#[update]
#[allow(non_snake_case)]
fn reputation__get_reputation_proof(mut req: GetRepProofRequest) -> GetRepProofResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get rep proof");

        s.get_rep_proof(req, caller())
    })
}

#[update]
#[allow(non_snake_case)]
fn reputation__init_once() {
    with_state_mut(|s| s.init(caller(), time()));
}

#[init]
fn init_hook() {
    set_timer(Duration::from_nanos(ONE_MONTH_NS), run_decay_round);
}

#[post_upgrade]
fn post_upgrade_hook() {
    set_timer(Duration::from_nanos(ONE_MONTH_NS), run_decay_round);
}

fn run_decay_round() {
    // one round is 100 entries (to not hit the instruction limit)
    let should_reschedule_immediately = with_state_mut(|s| s.decay(100, time()));

    if should_reschedule_immediately {
        // reschedule immediately, if after the round there are still unprocessed entries (the state knows where to continue from)
        set_timer(Duration::from_millis(0), run_decay_round);
    } else {
        // reschedule next week, if the decay is complete
        set_timer(Duration::from_nanos(ONE_MONTH_NS), run_decay_round);
    }
}

fn with_state<R, F: FnOnce(&ReputationState) -> R>(f: F) -> R {
    STATE.with(|s| {
        let state_ref = s.borrow();
        let state = &*state_ref;

        f(state)
    })
}

fn with_state_mut<R, F: FnOnce(&mut ReputationState) -> R>(f: F) -> R {
    STATE.with(|s| {
        let mut state_ref = s.borrow_mut();
        let state = &mut *state_ref;

        f(state)
    })
}

export_candid!();
