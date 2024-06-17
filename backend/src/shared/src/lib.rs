use async_trait::async_trait;
use candid::{CandidType, Principal};

use serde::Deserialize;

pub mod bank;
pub mod e8s;
pub mod humans;
pub mod icrc1;
pub mod proof;
pub mod tasks;
pub mod votings;

pub type TimestampNs = u64;
pub type DurationNs = u64;

#[async_trait]
pub trait Guard<T> {
    /// IT HAS TO DO ALL THE ASYNC STUFF AFTER IT ACCESSES THE STATE OR CONTEXT
    async fn validate_and_escape(&mut self, state: &T, ctx: &GuardContext) -> Result<(), String>;
}

pub struct GuardContext {
    pub caller: Principal,
    pub caller_is_voting_canister: bool,
    pub caller_is_task_canister: bool,
    pub caller_is_bank_canister: bool,
    pub now: TimestampNs,
    pub canister_ids: CanisterIds,
}

impl GuardContext {
    pub fn new(canister_ids: &CanisterIds, caller: Principal, now: TimestampNs) -> Self {
        Self {
            caller,
            now,
            caller_is_voting_canister: caller == canister_ids.votings_canister_id,
            caller_is_task_canister: caller == canister_ids.tasks_canister_id,
            caller_is_bank_canister: caller == canister_ids.bank_canister_id,
            canister_ids: *canister_ids,
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Copy)]
pub struct CanisterIds {
    pub humans_canister_id: Principal,
    pub votings_canister_id: Principal,
    pub tasks_canister_id: Principal,
    pub bank_canister_id: Principal,
}

#[macro_export]
macro_rules! btreemap {
    ($($key:expr => $value:expr),* $(,)?) => {
        {
            let mut map = BTreeMap::new();
            $(
                map.insert($key, $value);
            )*
            map
        }
    };
}

pub fn escape_script_tag(s: &str) -> String {
    html_escape::encode_script(s).to_string()
}
