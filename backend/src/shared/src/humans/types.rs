use candid::{CandidType, Deserialize, Nat, Principal};
use garde::Validate;

use crate::{e8s::E8s, TimestampNs};

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct Profile {
    #[garde(skip)]
    pub id: Principal,
    #[garde(length(graphemes, min = 3, max = 128))]
    pub name: Option<String>,
    #[garde(length(bytes, max = 5120))]
    pub avatar_src: Option<String>,
    #[garde(skip)]
    pub registered_at: TimestampNs,
}

impl Profile {
    pub fn escape(&mut self) {
        if let Some(name) = &self.name {
            self.name = Some(html_escape::encode_script(name).to_string());
        }
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetProfilesRequest {
    #[garde(length(min = 1))]
    pub ids: Vec<Principal>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetProfilesResponse {
    #[garde(length(min = 1), dive)]
    pub profiles: Vec<Profile>,
}

#[derive(Validate, CandidType, Deserialize)]
pub struct RegisterOrUpdateRequest {
    #[garde(length(graphemes, min = 3, max = 128))]
    pub name: Option<String>,
    #[garde(length(bytes, max = 5120))]
    pub avatar_src: Option<String>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct RewardsInfo {
    pub hours_balance: E8s,
    pub total_earned_hours: E8s,
    pub storypoints_balance: E8s,
    pub total_earned_storypoints: E8s,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct InitRequest {
    pub tasks_canister: Principal,
    pub bank_canister: Principal,
    pub sasha: Principal,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct BalanceEntry {
    pub id: Principal,
    pub hours: E8s,
    pub storypoints: E8s,
}

#[derive(CandidType, Deserialize, Clone, Validate)]
pub struct MintRequest {
    #[garde(length(min = 1))]
    pub entries: Vec<BalanceEntry>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct SpendRequest {
    pub id: Principal,
    pub hours: E8s,
    pub storypoints: E8s,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct RefundRequest {
    pub id: Principal,
    pub hours: E8s,
    pub storypoints: E8s,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct GetInfoRequest {
    pub of: Principal,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct GetInfoResponse {
    pub id: Principal,
    pub hours_total_supply: E8s,
    pub storypoints_total_supply: E8s,
    pub info: RewardsInfo,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
#[garde(context(WeeklyRateHoursE8sContext))]
pub struct TeamMemberInfo {
    #[garde(skip)]
    pub id: Principal,
    #[garde(custom(weekly_hours_in_range))]
    pub weekly_rate_hours: E8s,
    #[garde(skip)]
    pub active: bool,
    #[garde(skip)]
    pub employed_at: TimestampNs,
}

pub struct WeeklyRateHoursE8sContext {
    min: E8s,
    max: E8s,
}

impl Default for WeeklyRateHoursE8sContext {
    fn default() -> Self {
        Self {
            min: E8s::one(),
            max: E8s(Nat::from(40u32)),
        }
    }
}

fn weekly_hours_in_range(value: &E8s, context: &WeeklyRateHoursE8sContext) -> garde::Result {
    if value.ge(&context.min) && value.le(&context.max) {
        Ok(())
    } else {
        Err(garde::Error::new(
            "Weekly hours rate not in range (from 1 to 40)",
        ))
    }
}

#[derive(CandidType, Deserialize, Validate)]
#[garde(context(WeeklyRateHoursE8sContext))]
pub struct Candidate {
    #[garde(skip)]
    pub id: Principal,
    #[garde(custom(weekly_hours_in_range))]
    pub weekly_rate_hours: E8s,
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
    pub weekly_rate_hours: E8s,
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
