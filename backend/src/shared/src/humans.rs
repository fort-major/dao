use candid::{CandidType, Deserialize, Principal};
use garde::Validate;

use crate::TimestampNs;

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
