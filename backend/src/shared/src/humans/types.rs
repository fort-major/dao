use candid::{CandidType, Deserialize, Principal};
use garde::Validate;

use crate::{e8s::E8s, TimestampNs};

pub const PROOF_MARKER: &str = "FMJ HUMANS CANISTER GET PROFILE PROOFS RESPONSE";

#[derive(CandidType, Deserialize, Clone)]
pub struct Profile {
    pub id: Principal,
    pub name: Option<String>,
    pub avatar_src: Option<String>,
    pub registered_at: TimestampNs,
    pub hours_balance: E8s,
    pub storypoints_balance: E8s,
    pub reputation: E8s,
    pub earned_hours: E8s,
    pub earned_storypoints: E8s,
    pub employment: Option<Employment>,
}

impl Profile {
    pub fn new(
        id: Principal,
        name: Option<String>,
        avatar_src: Option<String>,
        now: TimestampNs,
    ) -> Self {
        Self {
            id,
            name,
            avatar_src,
            registered_at: now,
            hours_balance: E8s::zero(),
            storypoints_balance: E8s::zero(),
            reputation: E8s::zero(),
            earned_hours: E8s::zero(),
            earned_storypoints: E8s::zero(),
            employment: None,
        }
    }

    pub fn edit_profile(
        &mut self,
        new_name_opt: Option<Option<String>>,
        new_avatar_src_opt: Option<Option<String>>,
    ) {
        if let Some(new_name) = new_name_opt {
            self.name = new_name;
        }

        if let Some(new_avatar_src) = new_avatar_src_opt {
            self.avatar_src = new_avatar_src;
        }
    }

    pub fn mint_rewards(&mut self, hours: E8s, storypoints: E8s) {
        self.reputation += &hours + &storypoints;
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
pub struct ProfileProof {
    #[garde(skip)]
    pub id: Principal,
    #[garde(skip)]
    pub is_team_member: bool,
    #[garde(skip)]
    pub reputation: E8s,
    #[garde(skip)]
    pub reputation_total_supply: E8s,
}
