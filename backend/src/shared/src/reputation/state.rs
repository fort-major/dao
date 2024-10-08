use candid::Principal;
use ic_stable_structures::{
    memory_manager::VirtualMemory, Cell, DefaultMemoryImpl, StableBTreeMap,
};

use crate::{
    e8s::E8s, liquid_democracy::types::DelegationTreeNode, votings::types::ONE_HOUR_NS, TimestampNs,
};

use super::{
    api::{
        GetBalanceRequest, GetBalanceResponse, GetRepProofRequest, GetRepProofResponse,
        GetTotalSupplyRequest, GetTotalSupplyResponse, MintRepRequest, MintRepResponse,
    },
    types::{
        RepBalanceEntry, ReputationDelegationTreeNode, ReputationProofBody, REPUTATION_PROOF_MARKER,
    },
};

pub type Memory = VirtualMemory<DefaultMemoryImpl>;
pub const CACHE_TTL_NS: TimestampNs = ONE_HOUR_NS * 8;

pub struct ReputationState {
    pub balances: StableBTreeMap<Principal, RepBalanceEntry, Memory>,
    pub total_supply: Cell<E8s, Memory>,
    pub decay_start_key: Cell<Option<Principal>, Memory>,
    pub initialized: Cell<bool, Memory>,
}

impl ReputationState {
    pub fn init(&mut self, caller: Principal, now: TimestampNs) {
        if *self.initialized.get() {
            panic!("Can't initialize twice");
        }

        self.initialized
            .set(true)
            .expect("Unable to store the initialized flag");

        let default_entry = RepBalanceEntry::new(E8s::one(), now);
        self.balances.insert(caller, default_entry);

        self.total_supply
            .set(E8s::one())
            .expect("Unable to store total supply");
    }

    pub fn mint(&mut self, req: MintRepRequest, now: TimestampNs) -> MintRepResponse {
        let mut total = E8s::zero();

        for (account, qty) in req.entries {
            total += &qty;

            let prev_opt = self.balances.get(&account);

            let entry = if let Some(mut prev) = prev_opt {
                prev.balance += qty;
                prev.updated_at = now;

                prev
            } else {
                RepBalanceEntry::new(qty, now)
            };

            self.balances.insert(account, entry);
        }

        self.total_supply
            .set(total + self.total_supply.get())
            .expect("Unable to store total supply");

        MintRepResponse {}
    }

    // returns true if should reschedule another decay
    pub fn decay(&mut self, items_num: u64, now: TimestampNs) -> bool {
        let mut iter = if let Some(start) = self.decay_start_key.get() {
            let mut i = self.balances.range(start..);
            i.next();

            i
        } else {
            self.balances.iter()
        };

        let mut entries_to_delete = Vec::new();
        let mut entries_to_update = Vec::new();
        let mut last_decay_key = None;
        let mut total_decay_amount = E8s::zero();

        for _ in 0..items_num {
            if let Some((account, mut entry)) = iter.next() {
                if entry.should_decay(now) {
                    let (should_delete, decay_amount) = entry.decay();
                    total_decay_amount += decay_amount;

                    if should_delete {
                        entries_to_delete.push(account);
                    } else {
                        entries_to_update.push((account, entry))
                    };
                }

                last_decay_key = Some(account);
            } else {
                last_decay_key = None;
                break;
            }
        }

        let should_reschedule = last_decay_key.is_some();

        for entry_to_delete in entries_to_delete {
            self.balances.remove(&entry_to_delete);
        }

        for (account, entry) in entries_to_update {
            self.balances.insert(account, entry);
        }

        self.total_supply
            .set(self.total_supply.get() - total_decay_amount)
            .expect("Unable to store total supply");

        self.decay_start_key
            .set(last_decay_key)
            .expect("Unable to store last decay key");

        should_reschedule
    }

    pub fn get_balances(&self, req: GetBalanceRequest) -> GetBalanceResponse {
        let entries = req
            .ids
            .into_iter()
            .map(|id| self.balances.get(&id).unwrap_or_default());

        GetBalanceResponse {
            entries: entries.collect(),
        }
    }

    pub fn get_total_supply(&self, _req: GetTotalSupplyRequest) -> GetTotalSupplyResponse {
        GetTotalSupplyResponse {
            total_supply: self.total_supply.get().clone(),
        }
    }

    pub fn get_rep_proof(&self, req: GetRepProofRequest) -> GetRepProofResponse {
        let cur_ld_node = req.liquid_democracy_proof.body.expect("UNREACHEABLE");
        let rep_root = self.map_ld_proof(cur_ld_node);

        let reputation_total_supply = self.total_supply.get().clone();

        let rep_proof = ReputationProofBody {
            reputation_total_supply,
            reputation_delegation_tree: rep_root,
        };

        GetRepProofResponse {
            marker: REPUTATION_PROOF_MARKER.to_string(),
            proof: rep_proof,
        }
    }

    fn map_ld_proof(&self, ld_proof_node: DelegationTreeNode) -> ReputationDelegationTreeNode {
        let reputation = self
            .balances
            .get(&ld_proof_node.id)
            .unwrap_or_default()
            .balance;

        let followers = ld_proof_node
            .followers
            .into_iter()
            .map(|it| self.map_ld_proof(it))
            .collect();

        ReputationDelegationTreeNode {
            id: ld_proof_node.id,
            topicset: ld_proof_node.topicset,
            reputation,
            followers,
        }
    }
}
