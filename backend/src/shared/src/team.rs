use candid::{CandidType, Nat, Principal};
use garde::Validate;
use serde::Deserialize;

use crate::TimestampNs;

#[derive(CandidType, Deserialize, Validate, Clone)]
#[garde(context(WeeklyRateHoursE8sContext))]
pub struct TeamMemberInfo {
    #[garde(skip)]
    pub id: Principal,
    #[garde(custom(weekly_hours_in_range))]
    pub weekly_rate_hours_e8s: Nat,
    #[garde(skip)]
    pub active: bool,
    #[garde(skip)]
    pub employed_at: TimestampNs,
    #[garde(skip)]
    pub total_earned_hours_e8s: Nat,
}

pub struct WeeklyRateHoursE8sContext {
    min: Nat,
    max: Nat,
}

impl Default for WeeklyRateHoursE8sContext {
    fn default() -> Self {
        Self {
            min: Nat::from(1u32),
            max: Nat::from(40u32),
        }
    }
}

fn weekly_hours_in_range(value: &Nat, context: &WeeklyRateHoursE8sContext) -> garde::Result {
    if value.ge(&context.min) && value.le(&context.max) {
        Ok(())
    } else {
        Err(garde::Error::new(
            "Weekly hours rate not in range (from 1 to 40)",
        ))
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct InitRequest {
    #[garde(skip)]
    pub sasha: Principal,
}

#[derive(CandidType, Deserialize, Validate)]
#[garde(context(WeeklyRateHoursE8sContext))]
pub struct Candidate {
    #[garde(skip)]
    pub id: Principal,
    #[garde(custom(weekly_hours_in_range))]
    pub weekly_rate_hours_e8s: Nat,
}

#[derive(CandidType, Deserialize, Validate)]
#[garde(context(WeeklyRateHoursE8sContext))]
pub struct EmployRequest {
    #[garde(length(min = 1), dive)]
    pub candidates: Vec<Candidate>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct UnemployRequest {
    #[garde(length(min = 1))]
    pub team_members: Vec<Principal>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct ModifyControllersRequest {
    #[garde(length(min = 1))]
    pub controllers: Vec<Principal>,
}

#[derive(CandidType, Deserialize, Validate)]
#[garde(context(WeeklyRateHoursE8sContext))]
pub struct WeeklyRateHoursEntry {
    #[garde(skip)]
    pub id: Principal,
    #[garde(custom(weekly_hours_in_range))]
    pub weekly_rate_hours_e8s: Nat,
}

#[derive(CandidType, Deserialize, Validate)]
#[garde(context(WeeklyRateHoursE8sContext))]
pub struct UpdateWeeklyHourRateRequest {
    #[garde(length(min = 1), dive)]
    pub entries: Vec<WeeklyRateHoursEntry>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetTeamMemberIdsResponse {
    #[garde(length(min = 1))]
    pub ids: Vec<Principal>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetTeamMembersRequest {
    #[garde(length(min = 1))]
    pub ids: Vec<Principal>,
}

#[derive(CandidType, Deserialize, Validate)]
#[garde(context(WeeklyRateHoursE8sContext))]
pub struct GetTeamMembersResponse {
    #[garde(length(min = 1), dive)]
    pub team_members: Vec<TeamMemberInfo>,
}
