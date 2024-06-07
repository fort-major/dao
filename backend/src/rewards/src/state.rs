use std::collections::{btree_map::Entry, BTreeMap};

use candid::{CandidType, Nat, Principal};
use serde::Deserialize;
use shared::{
    btreemap,
    rewards::{
        GetInfoRequest, GetInfoResponse, InitRequest, MintRequest, RewardsInfo, SpendRequest,
    },
};

#[derive(CandidType, Deserialize, Clone)]
pub struct State {
    pub tasks_canister: Principal,
    pub bank_canister: Principal,
    pub hours_total_supply_e8s: Nat,
    pub storypoints_total_supply_e8s: Nat,
    pub rewards_info: BTreeMap<Principal, RewardsInfo>,
}

impl State {
    pub fn new(req: InitRequest) -> Self {
        let sasha = RewardsInfo {
            hours_balance_e8s: Nat::from(1_0000_0000u64),
            storypoints_balance_e8s: Nat::from(1_0000_0000u64),
            total_earned_hours_e8s: Nat::from(1_0000_0000u64),
            total_earned_storypoints_e8s: Nat::from(1_0000_0000u64),
        };

        State {
            tasks_canister: req.tasks_canister,
            bank_canister: req.bank_canister,
            hours_total_supply_e8s: sasha.total_earned_hours_e8s.clone(),
            storypoints_total_supply_e8s: sasha.total_earned_storypoints_e8s.clone(),
            rewards_info: btreemap! { req.sasha => sasha },
        }
    }

    // [SECURITY CRITICAL]
    pub fn mint(&mut self, req: MintRequest, caller: Principal) -> Result<(), String> {
        self.assert_is_tasks_canister(&caller)?;

        for entry in req.entries {
            self.hours_total_supply_e8s += entry.hours_e8s.clone();
            self.storypoints_total_supply_e8s += entry.storypoints_e8s.clone();

            match self.rewards_info.entry(entry.id) {
                Entry::Occupied(mut e) => {
                    let info = e.get_mut();

                    info.hours_balance_e8s += entry.hours_e8s.clone();
                    info.total_earned_hours_e8s += entry.hours_e8s.clone();

                    info.storypoints_balance_e8s += entry.storypoints_e8s.clone();
                    info.total_earned_storypoints_e8s += entry.storypoints_e8s.clone();
                }
                Entry::Vacant(e) => {
                    let info = RewardsInfo {
                        hours_balance_e8s: entry.hours_e8s.clone(),
                        total_earned_hours_e8s: entry.hours_e8s,

                        storypoints_balance_e8s: entry.storypoints_e8s.clone(),
                        total_earned_storypoints_e8s: entry.storypoints_e8s,
                    };

                    e.insert(info);
                }
            }
        }

        Ok(())
    }

    // [SECURITY CRITICAL]
    // called by the bank canister for a single user
    // should panic early and only respond with success if everything went good
    pub fn spend(&mut self, entry: SpendRequest, caller: Principal) -> Result<(), String> {
        self.assert_is_bank_canister(&caller)?;

        if let Some(info) = self.rewards_info.get_mut(&entry.id) {
            if info.hours_balance_e8s.lt(&entry.hours_e8s) {
                return Err(format!("Accont {} has insufficient hours", entry.id));
            }

            if info.storypoints_balance_e8s.lt(&entry.storypoints_e8s) {
                return Err(format!("Accont {} has insufficient storypoints", entry.id));
            }

            info.hours_balance_e8s -= entry.hours_e8s;
            info.storypoints_balance_e8s -= entry.storypoints_e8s;
        } else {
            return Err(format!("Account {} does not exist", entry.id));
        }

        Ok(())
    }

    pub fn get_info_of(&self, req: GetInfoRequest) -> GetInfoResponse {
        let info = if let Some(info) = self.rewards_info.get(&req.of) {
            info.clone()
        } else {
            RewardsInfo {
                hours_balance_e8s: Nat::from(0u32),
                total_earned_hours_e8s: Nat::from(0u32),
                storypoints_balance_e8s: Nat::from(0u32),
                total_earned_storypoints_e8s: Nat::from(0u32),
            }
        };

        GetInfoResponse {
            id: req.of,
            hours_total_supply_e8s: self.hours_total_supply_e8s.clone(),
            storypoints_total_supply_e8s: self.storypoints_total_supply_e8s.clone(),
            info,
        }
    }

    fn assert_is_tasks_canister(&self, testee: &Principal) -> Result<(), String> {
        if testee.eq(&self.tasks_canister) {
            Ok(())
        } else {
            Err(format!("The caller is not the tasks canister"))
        }
    }

    fn assert_is_bank_canister(&self, testee: &Principal) -> Result<(), String> {
        if testee.eq(&self.bank_canister) {
            Ok(())
        } else {
            Err(format!("The caller is not the bank canister"))
        }
    }
}
