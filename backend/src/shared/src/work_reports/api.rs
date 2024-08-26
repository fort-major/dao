use candid::{CandidType, Nat, Principal};
use garde::Validate;

use serde::Deserialize;
use sha2::Digest;

use crate::{
    bufs_le,
    e8s::E8s,
    escape_script_tag,
    humans::api::{POW_COMPLEXITY, POW_DELIMITER, POW_END, POW_START},
    liquid_democracy::types::DecisionTopicId,
    pagination::{PageRequest, PageResponse},
    proof::ReputationProof,
    Guard, ENV_VARS,
};

use super::{
    state::WorkReportState,
    types::{ArchivedWorkReport, WorkReportId, WorkReportPub},
};

#[derive(CandidType, Deserialize, Validate)]
pub struct CreateWorkReportRequest {
    #[garde(skip)]
    pub decision_topic: DecisionTopicId,
    #[garde(length(graphemes, min = 10, max = 256))]
    pub title: String,
    #[garde(length(graphemes, min = 16, max = 1024))]
    pub goal: String,
    #[garde(length(graphemes, min = 16, max = 4096))]
    pub description: String,
    #[garde(length(graphemes, min = 16, max = 1024))]
    pub result: String,
    #[garde(skip)]
    pub want_rep: bool,
    #[garde(dive)]
    pub reputation_proof: ReputationProof,
    #[garde(skip)]
    pub pow: [u8; 32],
    #[garde(skip)]
    pub nonce: Nat,
}

impl CreateWorkReportRequest {
    pub fn hash(&self, caller: &Principal, id: &Principal) -> [u8; 32] {
        let mut hasher = sha2::Sha256::new();
        hasher.update(POW_START);
        hasher.update(id.as_slice());
        hasher.update(POW_DELIMITER);
        hasher.update(caller.as_slice());
        hasher.update(POW_DELIMITER);

        hasher.update(self.decision_topic.to_le_bytes().as_slice());
        hasher.update(POW_DELIMITER);
        hasher.update(self.title.as_bytes());
        hasher.update(POW_DELIMITER);
        hasher.update(self.goal.as_bytes());
        hasher.update(POW_DELIMITER);
        hasher.update(self.description.as_bytes());
        hasher.update(POW_DELIMITER);
        hasher.update(self.result.as_bytes());
        hasher.update(POW_DELIMITER);
        hasher.update(&bool_to_bytes(self.want_rep));
        hasher.update(POW_DELIMITER);

        hasher.update(self.nonce.0.to_bytes_le());
        hasher.update(POW_END);

        hasher.finalize().into()
    }
}

impl Guard<WorkReportState> for CreateWorkReportRequest {
    fn validate_and_escape(
        &mut self,
        _state: &WorkReportState,
        caller: Principal,
        now: crate::TimestampNs,
    ) -> Result<(), String> {
        if !bufs_le(&self.pow[0..POW_COMPLEXITY.len()], POW_COMPLEXITY) {
            return Err(format!("The Proof Of Work is of invalid complexity"));
        }

        let expected = self.hash(&caller, &ENV_VARS.work_reports_canister_id);
        if expected != self.pow {
            return Err(format!(
                "The Proof Of Work is invalid: expected {:?}, received {:?}",
                expected, self.pow
            ));
        }

        self.title = escape_script_tag(self.title.trim());
        self.goal = escape_script_tag(self.goal.trim());
        self.description = escape_script_tag(self.description.trim());
        self.result = escape_script_tag(self.result.trim());

        self.validate(&()).map_err(|e| e.to_string())?;
        self.reputation_proof.assert_valid_for(caller, now)?;

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct CreateWorkReportResponse {
    #[garde(skip)]
    pub id: WorkReportId,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct EvaluateWorkReportRequest {
    #[garde(skip)]
    pub id: WorkReportId,
    #[garde(skip)]
    pub score: E8s,
    #[garde(skip)]
    pub is_spam: bool,
    #[garde(dive)]
    pub reputation_proof: ReputationProof,
}

impl Guard<WorkReportState> for EvaluateWorkReportRequest {
    fn validate_and_escape(
        &mut self,
        state: &WorkReportState,
        caller: Principal,
        now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())?;
        self.reputation_proof.assert_valid_for(caller, now)?;

        if !state.work_reports.contains_key(&self.id) {
            return Err(format!("Report #{} not found", self.id));
        }

        if self.score > E8s(Nat::from(100_0000_0000u64)) {
            return Err(format!("Max score is 100.0"));
        }

        Ok(())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct EvaluateWorkReportResponse {
    #[garde(skip)]
    pub result: Option<bool>,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct WorkReportFilter {
    #[garde(skip)]
    pub decision_topic_id: Option<DecisionTopicId>,
    #[garde(skip)]
    pub archived: bool,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetWorkReportIdsRequest {
    #[garde(dive)]
    pub pagination: PageRequest,
    #[garde(dive)]
    pub filter: WorkReportFilter,
}

impl Guard<WorkReportState> for GetWorkReportIdsRequest {
    fn validate_and_escape(
        &mut self,
        _state: &WorkReportState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetWorkReportIdsResponse {
    #[garde(skip)]
    pub entries: Vec<WorkReportId>,
    #[garde(dive)]
    pub pagination: PageResponse,
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetWorkReportsByIdRequest {
    #[garde(length(min = 1, max = 100))]
    pub ids: Vec<WorkReportId>,
}

impl Guard<WorkReportState> for GetWorkReportsByIdRequest {
    fn validate_and_escape(
        &mut self,
        _state: &WorkReportState,
        _caller: Principal,
        _now: crate::TimestampNs,
    ) -> Result<(), String> {
        self.validate(&()).map_err(|e| e.to_string())
    }
}

#[derive(CandidType, Deserialize, Validate)]
pub enum WorkReportKind {
    Common(#[garde(skip)] WorkReportPub),
    Archive(#[garde(skip)] ArchivedWorkReport),
}

#[derive(CandidType, Deserialize, Validate)]
pub struct GetWorkReportsByIdResponse {
    #[garde(skip)]
    pub entries: Vec<Option<WorkReportKind>>,
}

fn bool_to_bytes(val: bool) -> [u8; 1] {
    if val {
        [1]
    } else {
        [0]
    }
}
