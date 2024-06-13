use candid::Principal;

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
    fn assert_valid_for(&self, state: &T, ctx: &GuardContext) -> Result<(), String>;
    fn escape(&mut self, state: &T) -> Result<(), String>;
}

pub struct GuardContext {
    pub caller: Principal,
    pub caller_is_team_member: bool,
    pub caller_is_voting_canister: bool,
    pub now: TimestampNs,
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
