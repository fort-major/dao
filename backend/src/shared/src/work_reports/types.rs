use std::collections::BTreeMap;

use candid::{CandidType, Principal};
use garde::Validate;
use serde::Deserialize;

use crate::{e8s::E8s, liquid_democracy::types::DecisionTopicId, TimestampNs};

pub type WorkReportId = u64;

#[derive(CandidType, Deserialize, Clone, Validate)]
pub struct WorkReport {
    #[garde(skip)]
    pub id: WorkReportId,
    #[garde(skip)]
    pub reporter: Principal,
    #[garde(skip)]
    pub created_at: TimestampNs,
    #[garde(skip)]
    pub updated_at: TimestampNs,

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

    #[garde(skip)]
    pub total_rep_supply: E8s,
    #[garde(skip)]
    pub total_rep_evaluated: E8s,
    #[garde(skip)]
    pub total_rep_said_is_spam: E8s,
    #[garde(skip)]
    pub evaluation: BTreeMap<Principal, ReportEval>,
}

impl WorkReport {
    pub fn new(
        id: WorkReportId,
        decision_topic: DecisionTopicId,
        title: String,
        goal: String,
        description: String,
        result: String,
        want_rep: bool,
        rep_total_supply: E8s,
        caller: Principal,
        now: TimestampNs,
    ) -> Self {
        Self {
            id,
            reporter: caller,
            created_at: now,
            updated_at: now,

            decision_topic,
            title,
            goal,
            description,
            result,
            want_rep,

            total_rep_supply: rep_total_supply,
            total_rep_evaluated: E8s::zero(),
            total_rep_said_is_spam: E8s::zero(),
            evaluation: BTreeMap::new(),
        }
    }

    pub fn revert_prev_eval(&mut self, evaluator: &Principal, depth: u32) -> bool {
        if let Some(prev_eval) = self.evaluation.remove(&evaluator) {
            if prev_eval.depth < depth {
                return false;
            }

            if prev_eval.is_spam {
                self.total_rep_said_is_spam -= prev_eval.rep;
            } else {
                self.total_rep_evaluated -= prev_eval.rep;
            }
        }

        true
    }

    pub fn evaluate(&mut self, eval: ReportEval, caller: Principal) {
        if eval.is_spam {
            self.total_rep_said_is_spam += &eval.rep;
        } else {
            self.total_rep_evaluated += &eval.rep;
        }

        self.evaluation.insert(caller, eval);
    }

    pub fn calc_resulting_score(&self) -> E8s {
        let mut total_score = E8s::zero();

        for eval in self.evaluation.values() {
            total_score += &eval.rep / &self.total_rep_supply * &eval.score;
        }

        total_score
    }

    pub fn threshold() -> E8s {
        E8s::f0_67()
    }

    pub fn eval_threshold_reached(&self) -> bool {
        &self.total_rep_evaluated / &self.total_rep_supply >= Self::threshold()
    }

    pub fn spam_threshold_reached(&self) -> bool {
        &self.total_rep_said_is_spam / &self.total_rep_supply >= Self::threshold()
    }

    pub fn already_evaluated(&self, caller: &Principal) -> bool {
        self.evaluation.contains_key(caller)
    }

    pub fn to_archived(self, total_score: E8s) -> ArchivedWorkReport {
        ArchivedWorkReport::V0001(ArchivedWorkReportV0001 {
            id: self.id,
            reporter: self.reporter,
            created_at: self.created_at,
            updated_at: self.updated_at,
            decision_topic: self.decision_topic,
            title: self.title,
            goal: self.goal,
            description: self.description,
            result: self.result,
            want_rep: self.want_rep,
            total_score,
        })
    }

    pub fn as_pub(&self, caller: &Principal) -> WorkReportPub {
        WorkReportPub {
            id: self.id,
            reporter: self.reporter,
            created_at: self.created_at,
            updated_at: self.updated_at,

            decision_topic: self.decision_topic,
            title: self.title.clone(),
            goal: self.goal.clone(),
            description: self.description.clone(),
            result: self.result.clone(),
            want_rep: self.want_rep,

            total_rep_supply: self.total_rep_supply.clone(),
            total_rep_evaluated: self.total_rep_evaluated.clone(),
            total_rep_said_is_spam: self.total_rep_said_is_spam.clone(),
            callers_evaluation: self.evaluation.get(caller).cloned(),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Validate)]
pub struct WorkReportPub {
    #[garde(skip)]
    pub id: WorkReportId,
    #[garde(skip)]
    pub reporter: Principal,
    #[garde(skip)]
    pub created_at: TimestampNs,
    #[garde(skip)]
    pub updated_at: TimestampNs,

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

    #[garde(skip)]
    pub total_rep_supply: E8s,
    #[garde(skip)]
    pub total_rep_evaluated: E8s,
    #[garde(skip)]
    pub total_rep_said_is_spam: E8s,
    #[garde(skip)]
    pub callers_evaluation: Option<ReportEval>,
}

#[derive(CandidType, Deserialize, Clone, Validate)]
pub struct ReportEval {
    #[garde(skip)]
    pub rep: E8s,
    #[garde(skip)]
    pub score: E8s,
    #[garde(skip)]
    pub is_spam: bool,
    #[garde(skip)]
    pub depth: u32,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct ArchivedWorkReportV0001 {
    pub id: WorkReportId,
    pub reporter: Principal,
    pub created_at: TimestampNs,
    pub updated_at: TimestampNs,
    pub decision_topic: DecisionTopicId,

    pub title: String,
    pub goal: String,
    pub description: String,
    pub result: String,
    pub want_rep: bool,

    pub total_score: E8s,
}

#[derive(CandidType, Deserialize, Clone)]
pub enum ArchivedWorkReport {
    V0001(ArchivedWorkReportV0001),
}
