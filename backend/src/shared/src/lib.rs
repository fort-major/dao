pub mod humans;
pub mod team;
pub mod votings;

pub type TaskId = u64;
pub type VotingId = u64;
pub type TimestampNs = u64;

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
