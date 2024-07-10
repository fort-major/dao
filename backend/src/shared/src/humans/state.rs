use std::collections::BTreeMap;

use candid::{CandidType, Deserialize, Nat, Principal};

use crate::{e8s::E8s, TimestampNs};

use super::{
    api::{
        EditProfileRequest, EditProfileResponse, EmployRequest, EmployResponse,
        GetProfileIdsRequest, GetProfileIdsResponse, GetProfileProofsRequest,
        GetProfileProofsResponse, GetProfilesRequest, GetProfilesResponse, GetTotalsRequest,
        GetTotalsResponse, MintRewardsRequest, MintRewardsResponse, RefundRewardsRequest,
        RefundRewardsResponse, RegisterRequest, RegisterResponse, SpendRewardsRequest,
        SpendRewardsResponse, UnemployRequest, UnemployResponse,
    },
    types::{Profile, ProfileProofBody, PROFILE_PROOFS_MARKER},
};

#[derive(CandidType, Deserialize, Default)]
pub struct HumansState {
    pub profiles: BTreeMap<Principal, Profile>,
    pub total_hours_minted: E8s,
    pub total_storypoints_minted: E8s,
    pub inited: bool,
}

impl HumansState {
    pub fn register(
        &mut self,
        req: RegisterRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> RegisterResponse {
        let profile = Profile::new(caller, req.name, now);
        self.profiles.insert(caller, profile);

        RegisterResponse {}
    }

    pub fn edit_profile(
        &mut self,
        req: EditProfileRequest,
        caller: Principal,
    ) -> EditProfileResponse {
        let profile = self.profiles.get_mut(&caller).unwrap();

        profile.edit_profile(req.new_name_opt);

        EditProfileResponse {}
    }

    pub fn mint_rewards(&mut self, req: MintRewardsRequest) -> MintRewardsResponse {
        let mut minted_hours = E8s::zero();
        let mut minted_storypoints = E8s::zero();

        for entry in req.rewards {
            if let Some(profile) = self.profiles.get_mut(&entry.solver) {
                minted_hours += &entry.reward_hours;
                minted_storypoints += &entry.reward_storypoints;

                profile.mint_rewards(entry.reward_hours, entry.reward_storypoints);
            } else {
                // No rewards for people without a profile!
            }
        }

        self.total_hours_minted += minted_hours;
        self.total_storypoints_minted += minted_storypoints;

        MintRewardsResponse {}
    }

    pub fn spend_rewards(&mut self, req: SpendRewardsRequest) -> SpendRewardsResponse {
        let profile = self.profiles.get_mut(&req.spender).unwrap();

        profile.spend_rewards(req.hours, req.storypoints);

        SpendRewardsResponse {}
    }

    pub fn refund_rewards(&mut self, req: RefundRewardsRequest) -> RefundRewardsResponse {
        let profile = self.profiles.get_mut(&req.spender).unwrap();

        profile.refund_rewards(req.hours, req.storypoints);

        RefundRewardsResponse {}
    }

    pub fn employ(&mut self, req: EmployRequest, now: TimestampNs) -> EmployResponse {
        let profile = self.profiles.get_mut(&req.candidate).unwrap();

        profile.employ(req.hours_a_week_commitment, now);

        EmployResponse {}
    }

    pub fn unemploy(&mut self, req: UnemployRequest) -> UnemployResponse {
        let profile = self.profiles.get_mut(&req.team_member).unwrap();

        profile.unemploy();

        UnemployResponse {}
    }

    pub fn get_profiles(&self, req: GetProfilesRequest) -> GetProfilesResponse {
        let profiles = req
            .ids
            .iter()
            .map(|id| self.profiles.get(id).cloned())
            .collect();

        GetProfilesResponse { entries: profiles }
    }

    pub fn get_profile_ids(&self, _req: GetProfileIdsRequest) -> GetProfileIdsResponse {
        let ids = self.profiles.keys().cloned().collect();

        GetProfileIdsResponse { ids }
    }

    pub fn get_profile_proofs(
        &self,
        _req: GetProfileProofsRequest,
        caller: Principal,
    ) -> GetProfileProofsResponse {
        let profile = self.profiles.get(&caller).unwrap();

        let proof = ProfileProofBody {
            id: caller,
            is_team_member: profile.is_employed(),
        };

        GetProfileProofsResponse {
            marker: PROFILE_PROOFS_MARKER.to_string(),
            proof,
        }
    }

    pub fn get_totals(&self, _req: GetTotalsRequest) -> GetTotalsResponse {
        GetTotalsResponse {
            hours: self.total_hours_minted.clone(),
            storypoints: self.total_storypoints_minted.clone(),
        }
    }

    pub fn init(&mut self, caller: Principal, now: TimestampNs) {
        if self.inited {
            panic!("Can't init twice");
        }

        self.inited = true;

        self.register(
            RegisterRequest {
                name: Some("Fort Major Creator".to_string()),
            },
            caller,
            now,
        );

        self.employ(
            EmployRequest {
                candidate: caller,
                hours_a_week_commitment: E8s(Nat::from(40_0000_0000u64)),
            },
            now,
        );
    }
}
