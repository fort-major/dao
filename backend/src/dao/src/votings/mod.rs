use std::{cell::RefCell, time::Duration};

use ic_cdk::{api::time, caller, query, spawn, update};
use shared::{
    tasks::{api::GetTasksRequest, client::TasksCanisterClient},
    votings::{
        api::{
            CastVoteRequest, CastVoteResponse, GetVotingsRequest, GetVotingsResponse,
            StartVotingRequest, StartVotingResponse,
        },
        state::VotingsState,
        types::{CallToExecute, VotingEvent, VotingId, VotingKind, VotingTimer},
    },
    ExecutionContext, Guard, TimestampNs,
};

use crate::utils::create_exec_context;

thread_local! {
    static VOTINGS_STATE: RefCell<Option<VotingsState>> = RefCell::default();
}

pub fn create_votings_state() -> VotingsState {
    VotingsState::new()
}

pub fn install_votings_state(new_state: Option<VotingsState>) -> Option<VotingsState> {
    VOTINGS_STATE.replace(new_state)
}

#[update]
#[allow(non_snake_case)]
async fn votings__start_voting(mut req: StartVotingRequest) -> StartVotingResponse {
    let ctx = create_exec_context();

    // validate the request
    with_state(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to start a voting");
    });

    // validate the entity a voting is trying to mutate
    validate_voting_related_entity(&mut req.kind, &ctx)
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
    let ctx = create_exec_context();
    let id = req.id;

    // validate the request
    let (resp, call_to_exec_opt) = with_state_mut(|s| {
        req.validate_and_escape(s, &ctx)
            .expect("Unable to cast a vote");

        s.cast_vote(req, &ctx)
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
        req.validate_and_escape(s, &create_exec_context())
            .expect("Unable to get votings");

        s.get_votings(req)
    })
}

fn start_voting_timer(timer: VotingTimer, now: TimestampNs) {
    match timer {
        VotingTimer::ExecOnQuorum {
            voting_id,
            timestamp,
        } => {
            if now >= timestamp {
                resolve_voting_on_timer(voting_id, &create_exec_context());
            } else {
                with_state_mut(|s| s.save_timer(voting_id, timer));

                ic_cdk_timers::set_timer(Duration::from_nanos(timestamp - now), move || {
                    resolve_voting_on_timer(voting_id, &create_exec_context());
                    with_state_mut(|s| s.remove_timer(&voting_id));
                });
            }
        }
    }
}

fn resolve_voting_on_timer(voting_id: VotingId, ctx: &ExecutionContext) {
    // resolve on timer
    let call_to_exec_opt = with_state_mut(|s| s.resolve_on_timer(voting_id, &ctx.canister_ids));

    // if the quorum is reached
    process_voting_result(voting_id, call_to_exec_opt)
}

fn process_voting_result(voting_id: VotingId, call_to_exec_opt: Option<CallToExecute>) {
    if let Some(call_to_exec) = call_to_exec_opt {
        spawn(async move {
            // execute the call
            let event = match call_to_exec.execute().await {
                Ok(_) => VotingEvent::VotingSuccess { voting_id },
                Err(e) => VotingEvent::VotingFail {
                    voting_id,
                    reason: e,
                },
            };

            // save the produced events and delete the voting
            with_state_mut(|s| {
                s.save_event(event);
                s.delete_voting(voting_id);
            });
        });
    }
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

async fn validate_voting_related_entity(
    kind: &mut VotingKind,
    ctx: &ExecutionContext,
) -> Result<(), String> {
    match kind {
        VotingKind::FinishEditTask { task_id } => {
            let tasks_canister = TasksCanisterClient::new(ctx.canister_ids.tasks_canister_id);
            let response = tasks_canister
                .tasks__get_tasks(GetTasksRequest {
                    ids: vec![*task_id],
                })
                .await
                .map_err(|(c, m)| format!("Unable to fetch tasks - [{:?}]: {}", c, m))?;

            let task = response
                .tasks
                .get(0)
                .ok_or(format!("Task {} not found", task_id))?
                .as_ref()
                .ok_or(format!("Task {} not found", task_id))?;

            if !task.can_edit() {
                return Err(format!("The task is in invalid state"));
            }
        }
        VotingKind::EvaluateTask { task_id, solutions } => {
            let tasks_canister = TasksCanisterClient::new(ctx.canister_ids.tasks_canister_id);
            let response = tasks_canister
                .tasks__get_tasks(GetTasksRequest {
                    ids: vec![*task_id],
                })
                .await
                .map_err(|(c, m)| format!("Unable to fetch tasks - [{:?}]: {}", c, m))?;

            let task = response
                .tasks
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