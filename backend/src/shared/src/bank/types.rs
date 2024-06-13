use candid::{CandidType, Deserialize};
use garde::Validate;

#[derive(CandidType, Deserialize, Validate, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum SwapFrom {
    Storypoint,
    Hour,
}

#[derive(CandidType, Deserialize, Validate, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum SwapInto {
    ICP,
    FMJ,
}
