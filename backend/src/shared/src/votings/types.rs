use std::collections::BTreeMap;

use candid::{CandidType, Deserialize, Nat, Principal};

use crate::{e8s::E8s, DurationNs, TimestampNs};

pub type VotingId = u64;

pub struct VotingBase {
    pub creator: Principal,
    pub created_at: TimestampNs,
    pub duration_ns: DurationNs,
    pub quorum: Threshold,
    pub finish_early: Threshold,
    pub reputation_total_supply: E8s,
    pub votes_per_option: Vec<BTreeMap<Principal, Vote>>,
}

impl VotingBase {
    pub fn new(
        reputation_total_supply: E8s,
        duration_ns: DurationNs,
        quorum: Threshold,
        finish_early: Threshold,
        num_options: u32,
        caller: Principal,
        now: TimestampNs,
    ) -> Self {
        Self {
            creator: caller,
            created_at: now,
            duration_ns,
            reputation_total_supply,
            quorum,
            finish_early,
            votes_per_option: vec![BTreeMap::new(); num_options as usize],
        }
    }

    pub fn cast_vote(
        &mut self,
        option_idx: u32,
        used_reputation: E8s,
        total_reputation: E8s,
        caller: Principal,
    ) {
        let vote = Vote {
            used_reputation,
            total_reputation,
        };

        self.votes_per_option[option_idx as usize].insert(caller, vote);
    }

    pub fn reset_votes(&mut self) {
        for option_votes in &mut self.votes_per_option {
            option_votes.clear();
        }
    }

    pub fn is_quorum_reached(&self) -> bool {
        for option_votes in &self.votes_per_option {
            let voted_rep = option_votes
                .values()
                .fold(E8s::zero(), |acc, v| acc + &v.total_reputation);

            let quorum_reached_for_option = self
                .quorum
                .reached(&self.reputation_total_supply, &voted_rep);

            if !quorum_reached_for_option {
                return false;
            }
        }

        true
    }

    pub fn is_finish_early_reached(&self) -> bool {
        for option_votes in &self.votes_per_option {
            let voted_rep = option_votes
                .values()
                .fold(E8s::zero(), |acc, v| acc + &v.total_reputation);

            let finish_early_reached_for_option = self
                .finish_early
                .reached(&self.reputation_total_supply, &voted_rep);

            if !finish_early_reached_for_option {
                return false;
            }
        }

        true
    }

    pub fn get_normalized_results(&self) -> Vec<E8s> {
        self.votes_per_option
            .iter()
            .map(|votes| {
                let (used_rep, voted_rep) = votes
                    .values()
                    .fold((E8s::zero(), E8s::zero()), |(acc_u, acc_t), v| {
                        (acc_u + &v.used_reputation, acc_t + &v.total_reputation)
                    });

                used_rep / voted_rep
            })
            .collect()
    }

    pub fn get_voters(&self) -> Vec<Vec<Principal>> {
        self.votes_per_option
            .iter()
            .map(|votes| votes.keys().copied().collect::<Vec<_>>())
            .collect()
    }
}

#[derive(Clone, Copy)]
pub enum Threshold {
    P25,
    P50,
    P75,
    P100,
}

impl Threshold {
    pub fn reached(&self, total: &E8s, share: &E8s) -> bool {
        let value = share / total;

        match self {
            Threshold::P25 => value >= E8s(Nat::from(2500_0000u64)),
            Threshold::P50 => value >= E8s(Nat::from(5000_0000u64)),
            Threshold::P75 => value >= E8s(Nat::from(7500_0000u64)),
            Threshold::P100 => value >= E8s(Nat::from(1_0000_0000u64)),
        }
    }
}

#[derive(Clone)]
pub struct Vote {
    pub used_reputation: E8s,
    pub total_reputation: E8s,
}
