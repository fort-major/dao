use candid::Principal;
use ic_cdk::{api::call::CallResult, call};

use super::api::{
    EditProfileRequest, EditProfileResponse, EmployRequest, EmployResponse, GetProfileIdsRequest,
    GetProfileIdsResponse, GetProfileProofsRequest, GetProfileProofsResponse, GetProfilesRequest,
    GetProfilesResponse, MintRewardsRequest, MintRewardsResponse, RefundRewardsRequest,
    RefundRewardsResponse, RegisterRequest, RegisterResponse, SpendRewardsRequest,
    SpendRewardsResponse, UnemployRequest, UnemployResponse,
};

pub struct HumansCanisterClient {
    pub canister_id: Principal,
}

impl HumansCanisterClient {
    pub fn new(canister_id: Principal) -> Self {
        Self { canister_id }
    }

    #[allow(non_snake_case)]
    pub async fn humans__register(&self, req: RegisterRequest) -> CallResult<RegisterResponse> {
        call(self.canister_id, "humans__register", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn humans__edit_profile(
        &self,
        req: EditProfileRequest,
    ) -> CallResult<EditProfileResponse> {
        call(self.canister_id, "humans__edit_profile", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn humans__mint_rewards(
        &self,
        req: MintRewardsRequest,
    ) -> CallResult<MintRewardsResponse> {
        call(self.canister_id, "humans__mint_rewards", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn humans__spend_rewards(
        &self,
        req: SpendRewardsRequest,
    ) -> CallResult<SpendRewardsResponse> {
        call(self.canister_id, "humans__spend_rewards", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn humans__refund_rewards(
        &self,
        req: RefundRewardsRequest,
    ) -> CallResult<RefundRewardsResponse> {
        call(self.canister_id, "humans__refund_rewards", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn humans__employ(&self, req: EmployRequest) -> CallResult<EmployResponse> {
        call(self.canister_id, "humans__employ", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn humans__unemploy(&self, req: UnemployRequest) -> CallResult<UnemployResponse> {
        call(self.canister_id, "humans__unemploy", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn humans__get_profiles(
        &self,
        req: GetProfilesRequest,
    ) -> CallResult<GetProfilesResponse> {
        call(self.canister_id, "humans__get_profiles", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn humans__get_profile_ids(
        &self,
        req: GetProfileIdsRequest,
    ) -> CallResult<GetProfileIdsResponse> {
        call(self.canister_id, "humans__get_profile_ids", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn humans__get_team_member_ids(
        &self,
        req: GetProfileIdsRequest,
    ) -> CallResult<GetProfileIdsResponse> {
        call(self.canister_id, "humans__get_team_member_ids", (req,))
            .await
            .map(|(it,)| it)
    }

    #[allow(non_snake_case)]
    pub async fn humans__get_profile_proofs(
        &self,
        req: GetProfileProofsRequest,
    ) -> CallResult<GetProfileProofsResponse> {
        call(self.canister_id, "humans__get_profile_proofs", (req,))
            .await
            .map(|(it,)| it)
    }
}
