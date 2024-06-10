use std::collections::{btree_map::Entry, BTreeMap};

use candid::{CandidType, Principal};
use garde::Validate;
use ic_cdk::api::time;
use serde::Deserialize;
use shared::humans::{GetProfilesRequest, GetProfilesResponse, Profile, RegisterOrUpdateRequest};

#[derive(CandidType, Deserialize, Default)]
pub struct State {
    profiles: BTreeMap<Principal, Profile>,
}

impl State {
    pub fn register(
        &mut self,
        request: RegisterOrUpdateRequest,
        caller: Principal,
    ) -> Result<(), String> {
        request.validate(&()).map_err(|e| e.to_string())?;

        match self.profiles.entry(caller) {
            Entry::Occupied(mut _e) => Err(format!("Profile {} already registered", caller)),
            Entry::Vacant(e) => {
                let mut profile = Profile {
                    id: caller,
                    name: request.name,
                    avatar_src: request.avatar_src,
                    registered_at: time(),
                };

                profile.escape();

                e.insert(profile);

                Ok(())
            }
        }
    }

    pub fn update_profile(
        &mut self,
        request: RegisterOrUpdateRequest,
        caller: Principal,
    ) -> Result<(), String> {
        request.validate(&()).map_err(|e| e.to_string())?;

        match self.profiles.entry(caller) {
            Entry::Occupied(mut e) => {
                let profile = e.get_mut();
                profile.name = request.name;
                profile.avatar_src = request.avatar_src;

                profile.escape();

                Ok(())
            }
            Entry::Vacant(_e) => Err(format!("The profile {} does not exist", caller)),
        }
    }

    pub fn get_profiles(&self, req: GetProfilesRequest) -> Result<GetProfilesResponse, String> {
        req.validate(&()).map_err(|e| e.to_string())?;

        let mut profiles = Vec::new();

        for id in &req.ids {
            if let Some(profile) = self.profiles.get(id) {
                profiles.push(profile.clone());
            } else {
                return Err(format!("No profile by id {}", id));
            }
        }

        Ok(GetProfilesResponse { profiles })
    }
}
