use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;

#[derive(CandidType, Deserialize, Validate)]
pub struct PageRequest {
    #[garde(skip)]
    pub reversed: bool,
    #[garde(skip)]
    pub skip: u32,
    #[garde(range(min = 1))]
    pub take: u32,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct PageResponse {
    #[garde(skip)]
    pub left: u32,
    #[garde(skip)]
    pub next: Option<Principal>,
}
