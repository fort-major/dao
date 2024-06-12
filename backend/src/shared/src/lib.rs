pub mod bank;
pub mod e8s;
pub mod humans;
pub mod icrc1;
pub mod rewards;
pub mod tasks;
pub mod team;
pub mod votings;

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
