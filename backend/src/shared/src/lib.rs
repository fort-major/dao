use candid::{CandidType, Principal};

use env::{
    APP_BANK_CANISTER_ID, APP_FMJ_CANISTER_ID, APP_HUMANS_CANISTER_ID, APP_ICP_CANISTER_ID,
    APP_ROOT_KEY, APP_TASKS_CANISTER_ID, APP_VOTINGS_CANISTER_ID,
};
use lazy_static::lazy_static;
use serde::Deserialize;

pub mod bank;
pub mod e8s;
mod env;
pub mod humans;
pub mod icrc1;
pub mod proof;
pub mod tasks;
pub mod votings;

pub type TimestampNs = u64;
pub type DurationNs = u64;

pub trait Guard<T> {
    fn validate_and_escape(
        &mut self,
        state: &T,
        caller: Principal,
        now: TimestampNs,
    ) -> Result<(), String>;
}

lazy_static! {
    pub static ref ENV_VARS: EnvVarsState = EnvVarsState::new();
}

#[derive(CandidType, Deserialize, Clone)]
pub struct EnvVarsState {
    pub humans_canister_id: Principal,
    pub votings_canister_id: Principal,
    pub tasks_canister_id: Principal,
    pub bank_canister_id: Principal,
    pub fmj_canister_id: Principal,
    pub icp_canister_id: Principal,
    pub ic_root_key: Vec<u8>,
}

impl EnvVarsState {
    pub fn new() -> Self {
        Self {
            humans_canister_id: Principal::from_text(APP_HUMANS_CANISTER_ID).unwrap(),
            votings_canister_id: Principal::from_text(APP_VOTINGS_CANISTER_ID).unwrap(),
            tasks_canister_id: Principal::from_text(APP_TASKS_CANISTER_ID).unwrap(),
            bank_canister_id: Principal::from_text(APP_BANK_CANISTER_ID).unwrap(),
            fmj_canister_id: Principal::from_text(APP_FMJ_CANISTER_ID).unwrap(),
            icp_canister_id: Principal::from_text(APP_ICP_CANISTER_ID).unwrap(),
            ic_root_key: APP_ROOT_KEY
                .trim_start_matches("[")
                .trim_end_matches("]")
                .split(",")
                .map(|chunk| chunk.trim().parse().expect("Unable to parse ic root key"))
                .collect(),
        }
    }
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
