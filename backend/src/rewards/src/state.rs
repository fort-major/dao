use std::collections::{btree_map::Entry, BTreeMap};

use candid::{CandidType, Nat, Principal};
use serde::Deserialize;
use shared::{
    btreemap,
    rewards::{
        GetInfoRequest, GetInfoResponse, InitRequest, MintRequest, RefundRequest, RewardsInfo,
        SpendRequest,
    },
    E8s,
};

#[derive(CandidType, Deserialize, Clone)]
pub struct State {
    pub tasks_canister: Principal,
    pub bank_canister: Principal,
    pub hours_total_supply: E8s,
    pub storypoints_total_supply: E8s,
    pub rewards_info: BTreeMap<Principal, RewardsInfo>,
}

impl State {
    pub fn new(req: InitRequest) -> Self {
        let sasha = RewardsInfo {
            hours_balance: Nat::from(1_0000_0000u64),
            storypoints_balance: Nat::from(1_0000_0000u64),
            total_earned_hours: Nat::from(1_0000_0000u64),
            total_earned_storypoints: Nat::from(1_0000_0000u64),
        };

        State {
            tasks_canister: req.tasks_canister,
            bank_canister: req.bank_canister,
            hours_total_supply: sasha.total_earned_hours.clone(),
            storypoints_total_supply: sasha.total_earned_storypoints.clone(),
            rewards_info: btreemap! { req.sasha => sasha },
        }
    }

    // [SECURITY CRITICAL]
    pub fn mint(&mut self, req: MintRequest, caller: Principal) -> Result<(), String> {
        self.assert_is_tasks_canister(&caller)?;

        for entry in req.entries {
            self.hours_total_supply += entry.hours.clone();
            self.storypoints_total_supply += entry.storypoints.clone();

            match self.rewards_info.entry(entry.id) {
                Entry::Occupied(mut e) => {
                    let info = e.get_mut();

                    info.hours_balance += entry.hours.clone();
                    info.total_earned_hours += entry.hours.clone();

                    info.storypoints_balance += entry.storypoints.clone();
                    info.total_earned_storypoints += entry.storypoints.clone();
                }
                Entry::Vacant(e) => {
                    let info = RewardsInfo {
                        hours_balance: entry.hours.clone(),
                        total_earned_hours: entry.hours,

                        storypoints_balance: entry.storypoints.clone(),
                        total_earned_storypoints: entry.storypoints,
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
            if info.hours_balance.lt(&entry.hours) {
                return Err(format!("Accont {} has insufficient hours", entry.id));
            }

            if info.storypoints_balance.lt(&entry.storypoints) {
                return Err(format!("Accont {} has insufficient storypoints", entry.id));
            }

            info.hours_balance -= entry.hours;
            info.storypoints_balance -= entry.storypoints;
        } else {
            return Err(format!("Account {} does not exist", entry.id));
        }

        Ok(())
    }

    pub fn refund(&mut self, req: RefundRequest, caller: Principal) -> Result<(), String> {
        self.assert_is_bank_canister(&caller)?;

        let account_info = self
            .rewards_info
            .get_mut(&req.id)
            .ok_or(format!("Account {} not found", req.id))?;

        account_info.hours_balance += req.hours;
        account_info.storypoints_balance += req.storypoints;

        Ok(())
    }

    pub fn get_info_of(&self, req: GetInfoRequest) -> GetInfoResponse {
        let info = if let Some(info) = self.rewards_info.get(&req.of) {
            info.clone()
        } else {
            RewardsInfo {
                hours_balance: Nat::from(0u32),
                total_earned_hours: Nat::from(0u32),
                storypoints_balance: Nat::from(0u32),
                total_earned_storypoints: Nat::from(0u32),
            }
        };

        GetInfoResponse {
            id: req.of,
            hours_total_supply: self.hours_total_supply.clone(),
            storypoints_total_supply: self.storypoints_total_supply.clone(),
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
