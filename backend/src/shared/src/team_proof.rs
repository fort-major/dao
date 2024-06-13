use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;

#[derive(CandidType, Deserialize, Validate)]
pub struct TeamProof {}

impl TeamProof {
    pub fn assert_valid_for(&self, caller: &Principal) -> Result<(), String> {
        Ok(())
    }
}
