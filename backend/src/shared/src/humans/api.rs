use candid::{CandidType, Nat, Principal};
use garde::Validate;
use serde::Deserialize;

use crate::{e8s::E8s, escape_script_tag, tasks::tasks::RewardEntry, Guard};

use super::{
    state::HumansState,
    types::{Profile, ProfileProof},
};

#[derive(CandidType, Deserialize, Validate)]
pub struct RegisterRequest {
    #[garde(length(graphemes, min = 2, max = 64))]
    pub name: Option<String>,
    #[garde(length(bytes, max = 5120))]
    pub avatar_src: Option<String>,
}

impl Guard<HumansState> for RegisterRequest {
    fn validate_and_escape(
        &mut self,
        state: &HumansState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if state.profiles.contains_key(&ctx.caller) {
            return Err(format!("The profile already exists"));
        }

        if let Some(name) = &mut self.name {
            *name = escape_script_tag(&name);
        }

        if let Some(avatar_src) = &mut self.avatar_src {
            *avatar_src = escape_script_tag(&avatar_src);
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct RegisterResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct EditProfileRequest {
    #[garde(length(graphemes, min = 2, max = 64))]
    pub new_name_opt: Option<Option<String>>,
    #[garde(length(bytes, max = 5120))]
    pub new_avatar_src_opt: Option<Option<String>>,
}

impl Guard<HumansState> for EditProfileRequest {
    fn validate_and_escape(
        &mut self,
        state: &HumansState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if !state.profiles.contains_key(&ctx.caller) {
            return Err(format!("The profile does not exist"));
        }

        if let Some(new_name) = &mut self.new_name_opt {
            if let Some(name) = new_name {
                *name = escape_script_tag(&name);
            }
        }

        if let Some(new_avatar_src) = &mut self.new_avatar_src_opt {
            if let Some(avatar_src) = new_avatar_src {
                *avatar_src = escape_script_tag(&avatar_src);
            }
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct EditProfileResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct MintRewardsRequest {
    #[garde(length(min = 1), dive)]
    pub rewards: Vec<RewardEntry>,
}

impl Guard<HumansState> for MintRewardsRequest {
    fn validate_and_escape(
        &mut self,
        state: &HumansState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if !ctx.caller_is_task_canister {
            return Err(format!("Access denied"));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct MintRewardsResponse {}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct SpendRewardsRequest {
    #[garde(skip)]
    pub spender: Principal,
    #[garde(skip)]
    pub hours: E8s,
    #[garde(skip)]
    pub storypoints: E8s,
}

impl Guard<HumansState> for SpendRewardsRequest {
    fn validate_and_escape(
        &mut self,
        state: &HumansState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if !ctx.caller_is_bank_canister {
            return Err(format!("Access denied"));
        }

        let profile = state
            .profiles
            .get(&self.spender)
            .ok_or(format!("No profile exists"))?;

        if profile.hours_balance < self.hours {
            return Err(format!("Insufficient hours balance"));
        }

        if profile.storypoints_balance < self.storypoints {
            return Err(format!("Insufficient storypoints balance"));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct SpendRewardsResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct RefundRewardsRequest {
    #[garde(skip)]
    pub spender: Principal,
    #[garde(skip)]
    pub hours: E8s,
    #[garde(skip)]
    pub storypoints: E8s,
}

impl Guard<HumansState> for RefundRewardsRequest {
    fn validate_and_escape(
        &mut self,
        state: &HumansState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if !ctx.caller_is_bank_canister {
            return Err(format!("Access denied"));
        }

        state
            .profiles
            .get(&self.spender)
            .map(|_| ())
            .ok_or(format!("No profile exists"))
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct RefundRewardsResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct EmployRequest {
    #[garde(skip)]
    pub candidate: Principal,
    #[garde(skip)]
    pub hours_a_week_commitment: E8s,
}

impl Guard<HumansState> for EmployRequest {
    fn validate_and_escape(
        &mut self,
        state: &HumansState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if !ctx.caller_is_voting_canister {
            return Err(format!("Access denied"));
        }

        if self.hours_a_week_commitment > E8s(Nat::from(40_0000_0000u64)) {
            return Err(format!("One can only commit up to 40 hours a week"));
        }

        let profile = state
            .profiles
            .get(&self.candidate)
            .ok_or(format!("Only humans with a profile can be employed"))?;

        if profile.is_employed() {
            return Err(format!("Already an employee"));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct EmployResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct UnemployRequest {
    #[garde(skip)]
    pub team_member: Principal,
}

impl Guard<HumansState> for UnemployRequest {
    fn validate_and_escape(
        &mut self,
        state: &HumansState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if !ctx.caller_is_voting_canister {
            return Err(format!("Access denied"));
        }

        let profile = state
            .profiles
            .get(&self.team_member)
            .ok_or(format!("Only humans with a profile can be unemployed"))?;

        if !profile.is_employed() {
            return Err(format!("Already an not a team member"));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct UnemployResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetProfilesRequest {
    #[garde(length(min = 1))]
    pub ids: Vec<Principal>,
}

impl Guard<HumansState> for GetProfilesRequest {
    fn validate_and_escape(
        &mut self,
        state: &HumansState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetProfilesResponse {
    #[garde(length(min = 1))]
    pub profiles: Vec<Option<Profile>>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetProfileIdsRequest {}

impl Guard<HumansState> for GetProfileIdsRequest {
    fn validate_and_escape(
        &mut self,
        state: &HumansState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetProfileIdsResponse {
    #[garde(skip)]
    pub ids: Vec<Principal>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetProfileProofsRequest {}

impl Guard<HumansState> for GetProfileProofsRequest {
    fn validate_and_escape(
        &mut self,
        state: &HumansState,
        ctx: &crate::GuardContext,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if state.profiles.contains_key(&ctx.caller) {
            Ok(())
        } else {
            Err(format!("No profile exist"))
        }
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetProfileProofsResponse {
    #[garde(dive)]
    pub proof: ProfileProof,
}
