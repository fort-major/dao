use std::collections::BTreeMap;

use candid::{CandidType, Principal};
use serde::Deserialize;

use crate::{e8s::E8s, pagination::PageResponse, TimestampNs};

use super::{
    api::{
        CreateWorkReportRequest, CreateWorkReportResponse, EvaluateWorkReportRequest,
        GetWorkReportIdsRequest, GetWorkReportIdsResponse, GetWorkReportsByIdRequest,
        GetWorkReportsByIdResponse, WorkReportKind,
    },
    types::{ArchivedWorkReport, ReportEval, WorkReport, WorkReportId},
};

#[derive(CandidType, Deserialize, Default)]
pub struct WorkReportState {
    pub work_report_id_generator: WorkReportId,
    pub work_reports: BTreeMap<WorkReportId, WorkReport>,
    pub work_reports_local_archive: BTreeMap<WorkReportId, ArchivedWorkReport>,
}

impl WorkReportState {
    pub fn create_work_report(
        &mut self,
        req: CreateWorkReportRequest,
        caller: Principal,
        now: TimestampNs,
    ) -> CreateWorkReportResponse {
        let id = self.generate_work_report_id();
        let rep_total_supply = req.reputation_proof.body.unwrap().reputation_total_supply;

        let it = WorkReport::new(
            id,
            req.decision_topic,
            req.title,
            req.goal,
            req.description,
            req.result,
            req.want_rep,
            rep_total_supply,
            caller,
            now,
        );

        self.work_reports.insert(id, it);

        CreateWorkReportResponse { id }
    }

    pub fn evalute_work_report(
        &mut self,
        req: EvaluateWorkReportRequest,
        _now: TimestampNs,
    ) -> Option<Option<WorkReport>> {
        let report = self.work_reports.get_mut(&req.id).unwrap();
        let rep_delegation_tree = req
            .reputation_proof
            .body
            .unwrap()
            .reputation_delegation_tree;
        let topicset = [report.decision_topic];

        rep_delegation_tree.traverse(
            &mut |node, depth| {
                if !node.topicset.matches(&topicset) {
                    return false;
                }

                let can_cast = report.revert_prev_eval(&node.id, depth);

                if !can_cast {
                    return false;
                }

                let eval = ReportEval {
                    score: req.score.clone(),
                    rep: node.reputation.clone(),
                    is_spam: req.is_spam,
                    depth,
                };

                report.evaluate(eval, node.id);

                true
            },
            0,
        );

        let result = if report.eval_threshold_reached() {
            Some(true)
        } else if report.spam_threshold_reached() {
            Some(false)
        } else {
            None
        };

        match result {
            Some(true) => Some(Some(self.delete_work_report(req.id))),
            Some(false) => {
                self.delete_work_report(req.id);
                Some(None)
            }
            None => None,
        }
    }

    pub fn delete_work_report(&mut self, id: WorkReportId) -> WorkReport {
        self.work_reports.remove(&id).unwrap()
    }

    pub fn archive_report(&mut self, mut report: WorkReport, score: E8s, now: TimestampNs) {
        let id = report.id;
        report.updated_at = now;

        let archived_report = report.to_archived(score.clone());
        self.work_reports_local_archive.insert(id, archived_report);
    }

    pub fn get_work_report_ids(&self, req: GetWorkReportIdsRequest) -> GetWorkReportIdsResponse {
        let (entries, left) = if req.filter.archived {
            let _iter = self.work_reports_local_archive.iter();

            let mut iter: Box<dyn Iterator<Item = (&u64, &ArchivedWorkReport)>> =
                if req.pagination.reversed {
                    if let Some(topic) = req.filter.decision_topic_id {
                        Box::new(_iter.rev().filter(move |(_, it)| match it {
                            ArchivedWorkReport::V0001(r) => r.decision_topic == topic,
                        }))
                    } else {
                        Box::new(_iter.rev())
                    }
                } else {
                    if let Some(topic) = req.filter.decision_topic_id {
                        Box::new(_iter.filter(move |(_, it)| match it {
                            ArchivedWorkReport::V0001(r) => r.decision_topic == topic,
                        }))
                    } else {
                        Box::new(_iter)
                    }
                };

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
                .map(|(id, _)| id)
                .cloned()
                .collect();

            let left = iter.count() as u32;

            (entries, left)
        } else {
            let _iter = self.work_reports.iter();

            let mut iter: Box<dyn Iterator<Item = (&u64, &WorkReport)>> = if req.pagination.reversed
            {
                if let Some(topic) = req.filter.decision_topic_id {
                    Box::new(
                        _iter
                            .rev()
                            .filter(move |(_, it)| it.decision_topic == topic),
                    )
                } else {
                    Box::new(_iter.rev())
                }
            } else {
                if let Some(topic) = req.filter.decision_topic_id {
                    Box::new(_iter.filter(move |(_, it)| it.decision_topic == topic))
                } else {
                    Box::new(_iter)
                }
            };

            let entries = iter
                .by_ref()
                .take(req.pagination.take as usize)
                .map(|(id, _)| id)
                .cloned()
                .collect();

            let left = iter.count() as u32;

            (entries, left)
        };

        GetWorkReportIdsResponse {
            entries,
            pagination: PageResponse { left, next: None },
        }
    }

    pub fn get_work_reports_by_id(
        &self,
        req: GetWorkReportsByIdRequest,
        caller: Principal,
    ) -> GetWorkReportsByIdResponse {
        let mut entries = Vec::new();

        for id in req.ids {
            if let Some(report) = self.work_reports.get(&id) {
                entries.push(Some(WorkReportKind::Common(report.as_pub(&caller))));
            } else if let Some(report) = self.work_reports_local_archive.get(&id) {
                entries.push(Some(WorkReportKind::Archive(report.clone())));
            } else {
                entries.push(None);
            }
        }

        return GetWorkReportsByIdResponse { entries };
    }

    fn generate_work_report_id(&mut self) -> WorkReportId {
        let id = self.work_report_id_generator;
        self.work_report_id_generator += 1;

        id
    }
}
