use candid::{CandidType, Deserialize, Principal};
use garde::Validate;

use crate::{e8s::E8s, TimestampNs};

pub const PROFILE_PROOFS_MARKER: &str = "FMJ HUMANS CANISTER GET PROFILE PROOFS RESPONSE";

#[derive(CandidType, Deserialize, Clone)]
pub struct Profile {
    pub id: Principal,
    pub name: Option<String>,
    pub registered_at: TimestampNs,
    pub hours_balance: E8s,
    pub storypoints_balance: E8s,
    pub earned_hours: E8s,
    pub earned_storypoints: E8s,
    pub employment: Option<Employment>,
}

impl Profile {
    pub fn new(id: Principal, name: Option<String>, now: TimestampNs) -> Self {
        Self {
            id,
            name,
            registered_at: now,
            hours_balance: E8s::zero(),
            storypoints_balance: E8s::zero(),
            earned_hours: E8s::zero(),
            earned_storypoints: E8s::zero(),
            employment: None,
        }
    }

    pub fn edit_profile(&mut self, new_name_opt: Option<Option<String>>) {
        if let Some(new_name) = new_name_opt {
            self.name = new_name;
        }
    }

    pub fn mint_rewards(&mut self, hours: E8s, storypoints: E8s) {
        self.earned_hours += &hours;
        self.earned_storypoints += &storypoints;

        self.hours_balance += &hours;
        self.storypoints_balance += &storypoints;

        if let Some(employment) = &mut self.employment {
            employment.hours_earned_during_employment += &hours;
        }
    }

    pub fn spend_rewards(&mut self, hours: E8s, storypoints: E8s) {
        self.hours_balance -= hours;
        self.storypoints_balance -= storypoints;
    }

    pub fn refund_rewards(&mut self, hours: E8s, storypoints: E8s) {
        self.hours_balance += hours;
        self.storypoints_balance += storypoints;
    }

    pub fn employ(&mut self, hours_a_week_commitment: E8s, now: TimestampNs) {
        self.employment = Some(Employment::new(hours_a_week_commitment, now));
    }

    pub fn unemploy(&mut self) {
        self.employment = None;
    }

    pub fn is_employed(&self) -> bool {
        self.employment.is_some()
    }
}

#[derive(CandidType, Deserialize, Clone)]
pub struct Employment {
    pub employed_at: TimestampNs,
    pub hours_a_week_commitment: E8s,
    pub hours_earned_during_employment: E8s,
}

impl Employment {
    pub fn new(hours_a_week_commitment: E8s, now: TimestampNs) -> Self {
        Self {
            employed_at: now,
            hours_a_week_commitment,
            hours_earned_during_employment: E8s::zero(),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Debug, Validate)]
pub struct ProfileProofBody {
    #[garde(skip)]
    pub id: Principal,
    #[garde(skip)]
    pub is_team_member: bool,
}
