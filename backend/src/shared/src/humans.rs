use candid::{CandidType, Deserialize, Principal};
use garde::Validate;

#[derive(CandidType, Deserialize, Validate, Clone)]
pub struct Profile {
    #[garde(skip)]
    pub id: Principal,
    #[garde(length(graphemes, min = 3, max = 128))]
    pub name: Option<String>,
    #[garde(length(bytes, max = 5120))]
    pub avatar_src: Option<String>,
}

#[derive(CandidType, Deserialize)]
pub struct GetProfilesRequest {
    pub ids: Vec<Principal>,
}

#[derive(CandidType, Deserialize)]
pub struct GetProfilesResponse {
    pub profiles: Vec<Profile>,
}

#[derive(Validate, CandidType, Deserialize)]
pub struct RegisterOrUpdateRequest {
    #[garde(length(graphemes, min = 3, max = 128))]
    pub name: Option<String>,
    #[garde(length(bytes, max = 5120))]
    pub avatar_src: Option<String>,
}
