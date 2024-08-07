use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;

use crate::{
    pagination::{PageRequest, PageResponse},
    tasks::{
        state::TasksState,
        types::{ArchivedTask, TaskId},
    },
    Guard, ENV_VARS,
};

use super::state::TaskArchiveState;

#[derive(CandidType, Deserialize, Validate)]
pub struct AppendBatchRequest {
    #[garde(length(min = 1))]
    pub tasks: Vec<ArchivedTask>,
}

impl Guard<TaskArchiveState> for AppendBatchRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TaskArchiveState,
        caller: candid::Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if caller != ENV_VARS.tasks_canister_id {
            return Err(format!("Access denied"));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct AppendBatchResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetArchivedTasksByIdRequest {
    #[garde(skip)]
    pub ids: Vec<TaskId>,
}

impl Guard<TaskArchiveState> for GetArchivedTasksByIdRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TaskArchiveState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

impl Guard<TasksState> for GetArchivedTasksByIdRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TasksState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetArchivedTasksByIdResponse {
    #[garde(skip)]
    pub entries: Vec<Option<ArchivedTask>>,
    #[garde(skip)]
    pub next: Option<Principal>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetArchivedTaskIdsRequest {
    #[garde(dive)]
    pub pagination: PageRequest,
}

impl Guard<TaskArchiveState> for GetArchivedTaskIdsRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TaskArchiveState,
        _caller: candid::Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

impl Guard<TasksState> for GetArchivedTaskIdsRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TasksState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetArchivedTaskIdsResponse {
    #[garde(skip)]
    pub entries: Vec<TaskId>,
    #[garde(dive)]
    pub pagination: PageResponse,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct SetNextRequest {
    #[garde(skip)]
    pub next: Option<Principal>,
}

impl Guard<TaskArchiveState> for SetNextRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TaskArchiveState,
        caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;

        if caller != ENV_VARS.tasks_canister_id {
            return Err(format!("Access denied"));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct SetNextResponse {}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetArchivedTasksStatsRequest {}

impl Guard<TaskArchiveState> for GetArchivedTasksStatsRequest {
    fn validate_and_escape(
        &mut self,
        _state: &TaskArchiveState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetArchivedTasksStatsResponse {
    #[garde(skip)]
    pub solved_tasks: u32,
    #[garde(skip)]
    pub next: Option<Principal>,
}
