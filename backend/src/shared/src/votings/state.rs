use std::collections::BTreeMap;

use candid::CandidType;
use serde::Deserialize;

use super::types::{Voting, VotingId};

#[derive(CandidType, Deserialize)]
pub struct VotingsState {
    pub votings: BTreeMap<VotingId, Voting>,
}

impl VotingsState {
    pub fn new() -> Self {
        Self { votings: BTreeMap::new() }
    }

    pub fn start_voting()
}