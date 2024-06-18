use std::collections::{BTreeMap, BTreeSet};

use candid::{CandidType, Deserialize, Nat, Principal};

use crate::{btreemap, e8s::E8s, TimestampNs};

use super::{
    api::{
        EditProfileRequest, EditProfileResponse, EmployRequest, EmployResponse,
        GetProfileIdsRequest, GetProfileIdsResponse, GetProfileProofsRequest,
        GetProfileProofsResponse, GetProfilesRequest, GetProfilesResponse, MintRewardsRequest,
        MintRewardsResponse, RefundRewardsRequest, RefundRewardsResponse, RegisterRequest,
        RegisterResponse, SpendRewardsRequest, SpendRewardsResponse, UnemployRequest,
        UnemployResponse,
    },
    types::{Profile, ProfileProof, PROOF_MARKER},
};

#[derive(CandidType, Deserialize)]
pub struct HumansState {
    pub profiles: BTreeMap<Principal, Profile>,
    pub team_members: BTreeSet<Principal>,
    pub total_hours_minted: E8s,
    pub total_storypoints_minted: E8s,
}

impl HumansState {
    pub fn new(sasha: Principal, now: TimestampNs) -> Self {
        let mut sasha_profile = Profile::new(sasha, Some("Sasha Vtyurin".to_string()), None, now);

        sasha_profile.employ(E8s(Nat::from(40_0000_0000u64)), now);
        sasha_profile.mint_rewards(E8s::one(), E8s::one());

        Self {
            profiles: btreemap! { sasha => sasha_profile },
            team_members: vec![sasha].into_iter().collect(),
            total_hours_minted: E8s::one(),
            total_storypoints_minted: E8s::one(),
        }
    }

    pub fn register(
        &mut self,
        req: RegisterRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> RegisterResponse {
        let profile = Profile::new(caller, req.name, req.avatar_src, now);
        self.profiles.insert(caller, profile);

        RegisterResponse {}
    }

    pub fn edit_profile(
        &mut self,
        req: EditProfileRequest,
        caller: Principal,
    ) -> EditProfileResponse {
        let profile = self.profiles.get_mut(&caller).unwrap();

        profile.edit_profile(req.new_name_opt, req.new_avatar_src_opt);

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

        self.team_members.insert(req.candidate);
        profile.employ(req.hours_a_week_commitment, now);

        EmployResponse {}
    }

    pub fn unemploy(&mut self, req: UnemployRequest) -> UnemployResponse {
        let profile = self.profiles.get_mut(&req.team_member).unwrap();

        self.team_members.remove(&req.team_member);
        profile.unemploy();

        UnemployResponse {}
    }

    pub fn get_profiles(&self, req: GetProfilesRequest) -> GetProfilesResponse {
        let profiles = req
            .ids
            .iter()
            .map(|id| self.profiles.get(id).cloned())
            .collect();

        GetProfilesResponse { profiles }
    }

    pub fn get_profile_ids(&self, _req: GetProfileIdsRequest) -> GetProfileIdsResponse {
        let ids = self.profiles.keys().cloned().collect();

        GetProfileIdsResponse { ids }
    }

    pub fn get_team_member_ids(&self, _req: GetProfileIdsRequest) -> GetProfileIdsResponse {
        let ids = self.team_members.iter().cloned().collect();

        GetProfileIdsResponse { ids }
    }

    pub fn get_profile_proofs(
        &self,
        _req: GetProfileProofsRequest,
        caller: Principal,
    ) -> GetProfileProofsResponse {
        let profile = self.profiles.get(&caller).unwrap();

        let proof = ProfileProof {
            id: caller,
            is_team_member: profile.is_employed(),
            reputation: profile.get_reputation(),
            reputation_total_supply: self.get_reputation_total_supply(),
        };

        GetProfileProofsResponse {
            marker: PROOF_MARKER.to_string(),
            proof,
        }
    }

    fn get_reputation_total_supply(&self) -> E8s {
        &self.total_hours_minted + &self.total_storypoints_minted
    }
}
