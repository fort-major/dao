use candid::{CandidType, Nat, Principal};
use garde::Validate;
use ic_stable_structures::{storable::Bound, Storable};
use num_bigint::BigUint;
use serde::Deserialize;

use crate::{e8s::E8s, votings::types::ONE_WEEK_NS, TimestampNs};

pub const REPUTATION_PROOF_MARKER: &str = "FMJ REPUTATION CANISTER GET REPUTATION PROOF RESPONSE";

#[derive(CandidType, Deserialize, Validate, Clone, Debug, Default)]
pub struct RepBalanceEntry {
    #[garde(skip)]
    pub balance: E8s,
    #[garde(skip)]
    pub updated_at: TimestampNs,
}

impl RepBalanceEntry {
    pub fn new(balance: E8s, now: TimestampNs) -> Self {
        Self {
            balance,
            updated_at: now,
        }
    }

    pub fn should_decay(&self, now: TimestampNs) -> bool {
        if now < self.updated_at {
            return false;
        }

        return now - self.updated_at >= ONE_WEEK_NS;
    }

    // returns true if the entry should be deleted (the balance decayed completely)
    pub fn decay(&mut self) -> (bool, E8s) {
        let mut total_decay_amount = E8s::zero();

        for _ in 0..4 {
            let decay_amount = self.balance.sqrt();
            total_decay_amount += &decay_amount;

            self.balance -= &decay_amount;

            if self.balance == E8s::zero() {
                return (true, total_decay_amount);
            }
        }

        return (false, total_decay_amount);
    }
}

impl Storable for RepBalanceEntry {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        let mut buf = Vec::new();

        buf.extend_from_slice(&self.updated_at.to_le_bytes());

        let balance_buf = self.balance.0 .0.to_bytes_le();

        if balance_buf.len() > 32 {
            unreachable!("Can't encode numbers that big");
        }

        buf.push(balance_buf.len() as u8);
        buf.extend_from_slice(&balance_buf);

        return std::borrow::Cow::Owned(buf);
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        let mut update_at_buf = [0u8; 8];
        update_at_buf.copy_from_slice(&bytes[..8]);
        let updated_at = u64::from_le_bytes(update_at_buf);

        let balance_len = bytes[8] as usize;
        let mut balance_buf = vec![0u8; balance_len];
        balance_buf.copy_from_slice(&bytes[9..]);

        let balance = E8s(Nat(BigUint::from_bytes_le(&balance_buf)));

        Self {
            balance,
            updated_at,
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 41, // 8 bytes timestamp, 32 bytes balance, 1 byte balance len
        is_fixed_size: true,
    };
}

#[derive(CandidType, Deserialize, Clone, Debug, Validate)]
pub struct ReputationProof {
    #[garde(skip)]
    pub id: Principal,
    #[garde(skip)]
    pub reputation: RepBalanceEntry,
    #[garde(skip)]
    pub reputation_total_supply: E8s,
}
