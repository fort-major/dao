use std::collections::BTreeMap;

use candid::{CandidType, Nat, Principal};
use garde::Validate;
use ic_cdk::api::time;
use serde::Deserialize;
use shared::{
    btreemap,
    team::{
        EmployRequest, GetTeamMemberIdsResponse, GetTeamMembersRequest, GetTeamMembersResponse,
        InitRequest, TeamMemberInfo, UnemployRequest, UpdateWeeklyHourRateRequest,
        WeeklyRateHoursE8sContext,
    },
};

#[derive(CandidType, Deserialize)]
pub struct State {
    team_members: BTreeMap<Principal, TeamMemberInfo>,
}

impl State {
    pub fn new(req: InitRequest) -> Result<Self, String> {
        req.validate(&()).map_err(|e| e.to_string())?;

        let sasha = TeamMemberInfo {
            id: req.sasha,
            weekly_rate_hours_e8s: Nat::from(40_0000_0000u64),
            active: true,
            employed_at: time(),
        };

        let state = State {
            team_members: btreemap! { sasha.id => sasha },
        };

        Ok(state)
    }

    pub fn employ(
        &mut self,
        req: EmployRequest,
        caller: Principal,
        controllers: Vec<Principal>,
    ) -> Result<(), String> {
        req.validate(&WeeklyRateHoursE8sContext::default())
            .map_err(|e| e.to_string())?;
        self.assert_is_controller(&caller, &controllers)?;

        let now = time();

        for candidate in req.candidates {
            let team_member = TeamMemberInfo {
                id: candidate.id,
                weekly_rate_hours_e8s: candidate.weekly_rate_hours_e8s,
                active: true,
                employed_at: now,
            };

            self.team_members.insert(team_member.id, team_member);
        }

        Ok(())
    }

    pub fn unemploy(
        &mut self,
        req: UnemployRequest,
        caller: Principal,
        controllers: Vec<Principal>,
    ) -> Result<(), String> {
        req.validate(&()).map_err(|e| e.to_string())?;
        self.assert_is_controller(&caller, &controllers)?;

        for id in &req.team_members {
            if let Some(member) = self.team_members.get_mut(id) {
                member.active = false;
            }
        }

        Ok(())
    }

    pub fn update_weekly_hour_rate(
        &mut self,
        req: UpdateWeeklyHourRateRequest,
        caller: Principal,
        controllers: Vec<Principal>,
    ) -> Result<(), String> {
        req.validate(&WeeklyRateHoursE8sContext::default())
            .map_err(|e| e.to_string())?;
        self.assert_is_controller(&caller, &controllers)?;

        for entry in req.entries {
            if let Some(member_info) = self.team_members.get_mut(&entry.id) {
                member_info.weekly_rate_hours_e8s = entry.weekly_rate_hours_e8s;
            }
        }

        Ok(())
    }

    pub fn get_team_member_ids(&self) -> GetTeamMemberIdsResponse {
        GetTeamMemberIdsResponse {
            ids: self.team_members.keys().copied().collect(),
        }
    }

    pub fn get_team_members(
        &self,
        req: GetTeamMembersRequest,
    ) -> Result<GetTeamMembersResponse, String> {
        let mut team_members = Vec::new();

        for id in req.ids {
            if let Some(info) = self.team_members.get(&id) {
                team_members.push(info.clone());
            } else {
                return Err(format!("Team member {} not found", id));
            }
        }

        Ok(GetTeamMembersResponse { team_members })
    }

    fn assert_is_controller(
        &self,
        testee: &Principal,
        controllers: &[Principal],
    ) -> Result<(), String> {
        if let Some(_) = controllers.iter().find(|it| testee.eq(it)) {
            Ok(())
        } else {
            Err(format!("Access denied: {} is not a controller", testee))
        }
    }
}
