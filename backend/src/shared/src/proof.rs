use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;

use crate::humans::types::ProfileProof;

#[derive(CandidType, Deserialize, Validate)]
pub struct Proof {
    #[garde(dive)]
    pub profile_proof: ProfileProof,
}

impl Proof {
    pub fn assert_valid_for(&self, caller: &Principal) -> Result<(), String> {
        Ok(())
    }
}
