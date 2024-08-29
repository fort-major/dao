use std::cell::RefCell;

use ic_cdk::{
    api::time,
    caller, export_candid, post_upgrade, pre_upgrade, query,
    storage::{stable_restore, stable_save},
    trap, update,
};
use shared::{
    e8s::E8s,
    humans::{api::MintRewardsRequest, client::HumansCanisterClient},
    reputation::{api::MintRepRequest, client::ReputationCanisterClient},
    tasks::types::RewardEntry,
    work_reports::{
        api::{
            CreateWorkReportRequest, CreateWorkReportResponse, EvaluateWorkReportRequest,
            EvaluateWorkReportResponse, GetWorkReportIdsRequest, GetWorkReportIdsResponse,
            GetWorkReportsByIdRequest, GetWorkReportsByIdResponse,
        },
        state::WorkReportState,
    },
    Guard, ENV_VARS,
};

#[update]
#[allow(non_snake_case)]
fn work_reports__create(mut req: CreateWorkReportRequest) -> CreateWorkReportResponse {
    STATE.with_borrow_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to create work report");

        s.create_work_report(req, caller(), time())
    })
}

#[update]
#[allow(non_snake_case)]
async fn work_reports__evaluate(mut req: EvaluateWorkReportRequest) -> EvaluateWorkReportResponse {
    let res_opt = STATE.with_borrow_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to evaluate work report");

        s.evalute_work_report(req, time())
    });

    if res_opt.is_none() {
        return EvaluateWorkReportResponse { result: None };
    }

    let res = res_opt.unwrap();

    // if was marked as spam - simply return
    if res.is_none() {
        return EvaluateWorkReportResponse {
            result: Some(false),
        };
    }

    // otherwise - mint rewards and archive
    let report = res.unwrap();
    let score = report.calc_resulting_score().to_precision_2();
    let want_rep = report.want_rep;
    let reporter = report.reporter;

    STATE.with_borrow_mut(|s| {
        s.archive_report(report, score.clone(), time());
    });

    if score == E8s::zero() {
        return EvaluateWorkReportResponse { result: Some(true) };
    }

    let reputation_canister = ReputationCanisterClient::new(ENV_VARS.reputation_canister_id);
    let mint_rep_req = MintRepRequest {
        entries: vec![(reporter, score.clone())],
    };

    let humans_canister = HumansCanisterClient::new(ENV_VARS.humans_canister_id);
    let mint_rewards_req = MintRewardsRequest {
        rewards: vec![RewardEntry {
            solver: reporter,
            reward_hours: E8s::zero(),
            reward_storypoints: score.clone(),
            want_rep,
        }],
    };

    if !mint_rewards_req.rewards.is_empty() {
        // TODO: add rescheduling
        if let Err((code, msg)) = humans_canister.humans__mint_rewards(mint_rewards_req).await {
            trap(&format!(
                "FATAL!!! Unable to mint rewards: [{:?}] {}",
                code, msg
            ));
        }
    }

    if want_rep {
        // TODO: add rescheduling
        if let Err((code, msg)) = reputation_canister.reputation__mint(mint_rep_req).await {
            trap(&format!(
                "FATAL!!! Unable to mint reputation: [{:?}] {}",
                code, msg
            ));
        }
    }

    EvaluateWorkReportResponse { result: Some(true) }
}

#[query]
#[allow(non_snake_case)]
fn work_reports__get_ids(mut req: GetWorkReportIdsRequest) -> GetWorkReportIdsResponse {
    STATE.with_borrow(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get work report ids");

        s.get_work_report_ids(req)
    })
}

#[query]
#[allow(non_snake_case)]
fn work_reports__get_by_id(mut req: GetWorkReportsByIdRequest) -> GetWorkReportsByIdResponse {
    STATE.with_borrow(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get work reports by id");

        s.get_work_reports_by_id(req, caller())
    })
}

thread_local! {
    static STATE: RefCell<WorkReportState> = RefCell::new(WorkReportState::default());
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    STATE.with_borrow(|s| stable_save((s,)).expect("Unable to stable save"))
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (state,): (WorkReportState,) = stable_restore().expect("Unable to stable restore");
    STATE.with_borrow_mut(|s| *s = state);
}

export_candid!();
