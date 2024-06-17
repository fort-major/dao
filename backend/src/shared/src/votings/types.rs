use std::collections::BTreeMap;

use candid::{encode_args, utils::ArgumentEncoder, Principal};
use ic_cdk::api::call::call_raw;

use crate::{
    e8s::E8s,
    tasks::{
        api::{EvaluateRequest, FinishEditTaskRequest},
        types::TaskId,
    },
    CanisterIds, DurationNs, TimestampNs,
};

pub const ONE_WEEK_NS: u64 = 1_000_000_000 * 60 * 60 * 24 * 7;

pub type VotingId = u64;

pub struct Voting {
    pub id: VotingId,
    pub base: VotingBase,
    pub kind: VotingKind,
    pub stage: VotingStage,
}

impl Voting {
    pub fn new_evaluate_task(
        id: VotingId,
        total_supply: E8s,
        task_id: TaskId,
        solutions: Vec<Principal>,
        caller: Principal,
        now: TimestampNs,
    ) -> Self {
        let base = VotingBase::new(
            ONE_WEEK_NS,
            &total_supply * E8s::third(),
            E8s::two_thrids(),
            total_supply * E8s::two_thrids(),
            solutions.len() as u32,
            caller,
            now,
        );

        Self {
            id,
            base,
            kind: VotingKind::EvaluateTask { task_id, solutions },
            stage: VotingStage::InProgress,
        }
    }

    pub fn cast_vote(
        &mut self,
        option_idx: u32,
        vote: Vote,
        canister_ids: &CanisterIds,
        caller: Principal,
    ) -> Option<CallToExecute> {
        self.base.votes_per_option[option_idx as usize].insert(caller, vote);

        if !self.base.is_finish_early_reached_for_all_options() {
            return None;
        }

        self.stage = VotingStage::Executing;

        let call_or_fail = self.kind.generate_resulting_call(&self.base, canister_ids);

        if let Some(call) = call_or_fail {
            Some(call)
        } else {
            self.stage = VotingStage::Fail(format!("Consensus not reached"));

            None
        }
    }

    pub fn resolve_on_timer(&mut self, canister_ids: &CanisterIds) -> Option<CallToExecute> {
        if !self.base.is_quorum_reached_for_all_options() {
            self.stage = VotingStage::Fail(format!("Quorum not reached for all options"));

            return None;
        }

        self.stage = VotingStage::Executing;

        let call_or_fail = self.kind.generate_resulting_call(&self.base, canister_ids);

        if let Some(call) = call_or_fail {
            Some(call)
        } else {
            self.stage = VotingStage::Fail(format!("Consensus not reached"));

            None
        }
    }

    pub fn reset_votes(&mut self) {
        for option_votes in &mut self.base.votes_per_option {
            option_votes.clear();
        }
    }

    pub fn can_cast_vote(&self) -> bool {
        matches!(self.stage, VotingStage::InProgress)
    }

    pub fn can_execute_on_timer(&self) -> bool {
        matches!(self.stage, VotingStage::InProgress)
    }
}

pub enum VotingStage {
    InProgress,
    Executing,
    Success,
    Fail(String),
}

pub enum VotingKind {
    FinishEditTask {
        task_id: TaskId,
    },
    // can't fail because of not reaching the consensus
    EvaluateTask {
        task_id: TaskId,
        solutions: Vec<Principal>,
    },
}

impl VotingKind {
    pub fn generate_resulting_call(
        &self,
        base: &VotingBase,
        canister_ids: &CanisterIds,
    ) -> Option<CallToExecute> {
        let result = match self {
            VotingKind::FinishEditTask { task_id } => {
                let result = base.calc_binary_results()[0];

                if !result {
                    return None;
                }

                let req = FinishEditTaskRequest { id: *task_id };

                CallToExecute::new(
                    canister_ids.tasks_canister_id,
                    "tasks__finish_edit_task".into(),
                    (req,),
                )
            }
            VotingKind::EvaluateTask { task_id, solutions } => {
                let normalized_results = base.calc_ranged_results();

                let evaluation_per_solution = normalized_results
                    .into_iter()
                    .enumerate()
                    .map(|(idx, eval)| (solutions[idx], eval))
                    .collect();

                let req = EvaluateRequest {
                    id: *task_id,
                    evaluation_per_solution,
                };

                CallToExecute::new(
                    canister_ids.tasks_canister_id,
                    "tasks__evaluate".into(),
                    (req,),
                )
            }
        };

        let call = result.expect("UNREACHEABLE! Unable to encode args for the call");

        Some(call)
    }
}

pub struct VotingBase {
    pub creator: Principal,
    pub created_at: TimestampNs,
    pub duration_ns: DurationNs,
    pub quorum: E8s,
    pub consensus: E8s,
    pub finish_early: E8s,
    pub votes_per_option: Vec<BTreeMap<Principal, Vote>>,
}

impl VotingBase {
    pub fn new(
        duration_ns: DurationNs,
        quorum: E8s,
        consensus: E8s,
        finish_early: E8s,
        num_options: u32,
        caller: Principal,
        now: TimestampNs,
    ) -> Self {
        Self {
            creator: caller,
            created_at: now,
            duration_ns,
            quorum,
            consensus,
            finish_early,
            votes_per_option: vec![BTreeMap::new(); num_options as usize],
        }
    }

    pub fn is_quorum_reached_for_all_options(&self) -> bool {
        for option_votes in &self.votes_per_option {
            let voted_rep = option_votes
                .values()
                .fold(E8s::zero(), |acc, v| acc + &v.total_voter_reputation);

            let quorum_reached_for_option = self.quorum <= voted_rep;

            if !quorum_reached_for_option {
                return false;
            }
        }

        true
    }

    pub fn is_finish_early_reached_for_all_options(&self) -> bool {
        for option_votes in &self.votes_per_option {
            let voted_rep = option_votes
                .values()
                .fold(E8s::zero(), |acc, v| acc + &v.total_voter_reputation);

            let finish_early_reached_for_option = self.finish_early <= voted_rep;

            if !finish_early_reached_for_option {
                return false;
            }
        }

        true
    }

    pub fn calc_results_raw(&self) -> Vec<(E8s, E8s, E8s)> {
        self.votes_per_option
            .iter()
            .map(|option_votes| {
                let (mut total, mut approve, mut reject) = (E8s::zero(), E8s::zero(), E8s::zero());

                for (_, vote) in option_votes {
                    total += &vote.total_voter_reputation;

                    if let Some(voter_approval) = &vote.approval_level {
                        approve += voter_approval;
                    } else {
                        reject += &vote.total_voter_reputation;
                    }
                }

                (total, approve, reject)
            })
            .collect()
    }

    pub fn calc_ranged_results(&self) -> Vec<Option<E8s>> {
        let raw_results = self.calc_results_raw();

        raw_results
            .into_iter()
            .map(|(total, approve, reject)| {
                if reject >= self.consensus {
                    None
                } else {
                    Some(approve / total)
                }
            })
            .collect()
    }

    pub fn calc_binary_results(&self) -> Vec<bool> {
        let raw_results = self.calc_results_raw();

        raw_results
            .into_iter()
            .map(|(_, approve, _)| approve >= self.consensus)
            .collect()
    }

    pub fn get_voters(&self) -> Vec<Vec<Principal>> {
        self.votes_per_option
            .iter()
            .map(|votes| votes.keys().copied().collect::<Vec<_>>())
            .collect()
    }
}

#[derive(Clone)]
pub struct Vote {
    // None means "Reject"
    pub approval_level: Option<E8s>,
    pub total_voter_reputation: E8s,
}

pub struct CallToExecute {
    pub canister_id: Principal,
    pub method_name: String,
    pub args_raw: Vec<u8>,
}

impl CallToExecute {
    pub fn new<A: ArgumentEncoder>(
        canister_id: Principal,
        method_name: String,
        args: A,
    ) -> Result<Self, String> {
        let args_raw = encode_args(args).map_err(|e| e.to_string())?;

        Ok(Self {
            canister_id,
            method_name,
            args_raw,
        })
    }

    pub async fn execute(self) -> Result<(), String> {
        call_raw(self.canister_id, &self.method_name, &self.args_raw, 0)
            .await
            .map_err(|(c, m)| format!("Error [{:?}]: {}", c, m))
            .map(|_| ())
    }
}
