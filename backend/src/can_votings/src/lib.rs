use std::{cell::RefCell, time::Duration};

use ic_cdk::{
    api::time,
    caller, export_candid, init, post_upgrade, pre_upgrade, query, spawn,
    storage::{stable_restore, stable_save},
    update,
};
use shared::{
    tasks::{api::GetTasksRequest, client::TasksCanisterClient},
    votings::{
        api::{
            CastVoteRequest, CastVoteResponse, GetVotingEventsRequest, GetVotingEventsResponse,
            GetVotingsRequest, GetVotingsResponse, StartVotingRequest, StartVotingResponse,
        },
        state::VotingsState,
        types::{CallToExecute, VotingEvent, VotingEventV1, VotingId, VotingKind, VotingTimer},
    },
    Guard, TimestampNs, ENV_VARS,
};

#[init]
fn init_hook() {
    let votings_state = create_votings_state();

    install_votings_state(Some(votings_state));
}

#[pre_upgrade]
fn pre_upgrade_hook() {
    let votings_state = install_votings_state(None);

    stable_save((votings_state,)).expect("Unable to stable save");
}

#[post_upgrade]
fn post_upgrade_hook() {
    let (votings_state,): (Option<VotingsState>,) =
        stable_restore().expect("Unable to stable restore");

    install_votings_state(votings_state);

    let timers = with_state(|s| s.timers.values().copied().collect::<Vec<_>>());
    let now = time();

    for timer in timers {
        start_voting_timer(timer, now);
    }
}

#[update]
#[allow(non_snake_case)]
async fn votings__start_voting(mut req: StartVotingRequest) -> StartVotingResponse {
    // validate the request
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to start a voting");
    });

    // validate the entity a voting is trying to mutate
    validate_voting_related_entity(&mut req.kind)
        .await
        .expect("Invalid voting");

    // start a voting
    let (response, timer) = with_state_mut(|s| s.start_voting(req, caller(), time()));

    start_voting_timer(timer, time());

    response
}

#[update]
#[allow(non_snake_case)]
async fn votings__cast_vote(mut req: CastVoteRequest) -> CastVoteResponse {
    let id = req.id;

    // validate the request
    let (resp, call_to_exec_opt) = with_state_mut(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to cast a vote");

        s.cast_vote(req, caller())
    });

    if !resp.decision_made {
        return resp;
    }

    process_voting_result(id, call_to_exec_opt);

    resp
}

#[query]
#[allow(non_snake_case)]
fn votings__get_votings(mut req: GetVotingsRequest) -> GetVotingsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get votings");

        s.get_votings(req, caller())
    })
}

#[query]
#[allow(non_snake_case)]
fn votings__get_events(mut req: GetVotingEventsRequest) -> GetVotingEventsResponse {
    with_state(|s| {
        req.validate_and_escape(s, caller(), time())
            .expect("Unable to get voting events");

        s.get_events(req)
    })
}

fn start_voting_timer(timer: VotingTimer, now: TimestampNs) {
    match timer {
        VotingTimer::ExecOnQuorum {
            voting_id,
            timestamp,
        } => {
            if now >= timestamp {
                resolve_voting_on_timer(voting_id);
            } else {
                with_state_mut(|s| s.save_timer(voting_id, timer));

                ic_cdk_timers::set_timer(Duration::from_nanos(timestamp - now), move || {
                    resolve_voting_on_timer(voting_id);
                    with_state_mut(|s| s.remove_timer(&voting_id));
                });
            }
        }
    }
}

fn resolve_voting_on_timer(voting_id: VotingId) {
    // resolve on timer
    let call_to_exec_opt = with_state_mut(|s| s.resolve_on_timer(voting_id));

    // if the quorum is reached
    process_voting_result(voting_id, call_to_exec_opt)
}

fn process_voting_result(voting_id: VotingId, call_to_exec_opt: Option<CallToExecute>) {
    if let Some(call_to_exec) = call_to_exec_opt {
        spawn(async move {
            // execute the call
            let event = match call_to_exec.execute().await {
                Ok(_) => VotingEvent::V0001(VotingEventV1::VotingSuccess { voting_id }),
                Err(e) => VotingEvent::V0001(VotingEventV1::VotingFail {
                    voting_id,
                    reason: e,
                }),
            };

            // save the produced events and delete the voting
            with_state_mut(|s| {
                s.save_event(event);
                s.delete_voting(voting_id);
            });
        });
    }
}

async fn validate_voting_related_entity(kind: &mut VotingKind) -> Result<(), String> {
    match kind {
        VotingKind::FinishEditTask { task_id } => {
            let tasks_canister = TasksCanisterClient::new(ENV_VARS.tasks_canister_id);
            let response = tasks_canister
                .tasks__get_tasks(GetTasksRequest {
                    ids: vec![*task_id],
                })
                .await
                .map_err(|(c, m)| format!("Unable to fetch tasks - [{:?}]: {}", c, m))?;

            let task = response
                .entries
                .get(0)
                .ok_or(format!("Task {} not found", task_id))?
                .as_ref()
                .ok_or(format!("Task {} not found", task_id))?;

            if !task.can_edit() {
                return Err(format!("The task is in invalid state"));
            }
        }
        VotingKind::EvaluateTask { task_id, solutions } => {
            let tasks_canister = TasksCanisterClient::new(ENV_VARS.tasks_canister_id);
            let response = tasks_canister
                .tasks__get_tasks(GetTasksRequest {
                    ids: vec![*task_id],
                })
                .await
                .map_err(|(c, m)| format!("Unable to fetch tasks - [{:?}]: {}", c, m))?;

            let task = response
                .entries
                .get(0)
                .ok_or(format!("Task {} not found", task_id))?
                .as_ref()
                .ok_or(format!("Task {} not found", task_id))?;

            if !task.can_evaluate() {
                return Err(format!("The task is in invalid state"));
            }

            // setting the solutions to what's inside the actual task, instead of relying on what the user has provided
            *solutions = task.solutions.keys().copied().collect();
        }
        _ => {
            // no validations for others
        }
    }

    Ok(())
}

thread_local! {
    static VOTINGS_STATE: RefCell<Option<VotingsState>> = RefCell::default();
}

pub fn create_votings_state() -> VotingsState {
    VotingsState::new()
}

pub fn install_votings_state(new_state: Option<VotingsState>) -> Option<VotingsState> {
    VOTINGS_STATE.replace(new_state)
}

fn with_state<R, F: FnOnce(&VotingsState) -> R>(f: F) -> R {
    VOTINGS_STATE.with(|s| {
        let state_ref = s.borrow();
        let state = state_ref
            .as_ref()
            .expect("Votings state is not initialized");

        f(state)
    })
}

fn with_state_mut<R, F: FnOnce(&mut VotingsState) -> R>(f: F) -> R {
    VOTINGS_STATE.with(|s| {
        let mut state_ref = s.borrow_mut();
        let state = state_ref
            .as_mut()
            .expect("Votings state is not initialized");

        f(state)
    })
}

export_candid!();
