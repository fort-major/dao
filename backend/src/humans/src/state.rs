use std::collections::{btree_map::Entry, BTreeMap};

use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;
use shared::humans::{Profile, RegisterOrUpdateRequest};

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
            Entry::Occupied(mut e) => Err(format!("Profile {} already registered", caller)),
            Entry::Vacant(e) => {
                let profile = Profile {
                    id: caller,
                    name: request.name,
                    avatar_src: request.avatar_src,
                };

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
                let profile = Profile {
                    id: caller,
                    name: request.name,
                    avatar_src: request.avatar_src,
                };

                *e.get_mut() = profile;

                Ok(())
            }
            Entry::Vacant(e) => Err(format!("The profile {} does not exist", caller)),
        }
    }

    pub fn get_profiles(&self, ids: &[Principal]) -> Result<Vec<Profile>, String> {
        let mut profiles = Vec::new();

        for id in ids {
            if let Some(profile) = self.profiles.get(id) {
                profiles.push(profile.clone());
            } else {
                return Err(format!("No profile by id {}", id));
            }
        }

        Ok(profiles)
    }
}
