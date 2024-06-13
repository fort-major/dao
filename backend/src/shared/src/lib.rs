use std::{collections::BTreeMap, marker::PhantomData};

use candid::{CandidType, Principal};

use ic_cdk::call;
use serde::Deserialize;

pub mod bank;
pub mod e8s;
pub mod humans;
pub mod icrc1;
pub mod rewards;
pub mod tasks;
pub mod team;
pub mod votings;

pub type TimestampNs = u64;

pub trait Guard<T> {
    fn validate_and_escape(&mut self, state: &T, ctx: &GuardContext) -> Result<(), String>;
}

pub struct GuardContext {
    pub caller: Principal,
    pub caller_is_team_member: bool,
    pub caller_is_voting_canister: bool,
    pub now: TimestampNs,
}

impl GuardContext {
    pub fn new(
        canister_ids: &CanisterIds,
        is_team_member: bool,
        caller: Principal,
        now: TimestampNs,
    ) -> Self {
        Self {
            caller,
            now,
            caller_is_team_member: is_team_member,
            caller_is_voting_canister: caller == canister_ids.votings_canister_id,
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Copy)]
pub struct CanisterIds {
    pub humans_canister_id: Principal,
    pub votings_canister_id: Principal,
    pub tasks_canister_id: Principal,
    pub bank_canister_id: Principal,
    pub fmj_canister_id: Principal,
    pub icp_canister_id: Principal,
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
