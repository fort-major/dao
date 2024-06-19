use std::collections::BTreeMap;

use candid::{encode_args, utils::ArgumentEncoder, CandidType, Principal};
use garde::Validate;
use ic_cdk::api::call::call_raw;

use serde::Deserialize;

use crate::{
    bank::{
        api::SetExchangeRateRequest,
        types::{SwapFrom, SwapInto},
    },
    e8s::E8s,
    humans::api::{EmployRequest, UnemployRequest},
    tasks::{
        api::{EvaluateRequest, FinishEditTaskRequest},
        types::TaskId,
    },
    DurationNs, TimestampNs, ENV_VARS,
};

pub const ONE_HOUR_NS: u64 = 1_000_000_000 * 60 * 60;
pub const ONE_DAY_NS: u64 = ONE_HOUR_NS * 24;
pub const ONE_WEEK_NS: u64 = ONE_DAY_NS * 7;

#[derive(CandidType, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum VotingId {
    FinishEditTask(TaskId),
    EvaluateTask(TaskId),
    BankSetExchangeRate((SwapFrom, SwapInto)),
    HumansEmploy(Principal),
    HumansUnemploy(Principal),
}

#[derive(CandidType, Deserialize, Clone)]
pub struct Voting {
    pub id: VotingId,
    pub base: VotingBase,
    pub kind: VotingKind,
    pub stage: VotingStage,
}

impl Voting {
    pub fn new(total_supply: E8s, kind: VotingKind, caller: Principal, now: TimestampNs) -> Self {
        let (duration_ns, quorum, consensus, finish_early, num_options) = match &kind {
            VotingKind::FinishEditTask { task_id: _ } => (
                ONE_WEEK_NS,
                &total_supply * E8s::forth(),
                E8s::two_thrids(),
                total_supply * E8s::two_thrids(),
                1,
            ),
            VotingKind::EvaluateTask {
                task_id: _,
                solutions,
            } => (
                ONE_WEEK_NS,
                &total_supply * E8s::third(),
                E8s::two_thrids(),
                total_supply * E8s::two_thrids(),
                solutions.len() as u32,
            ),
            VotingKind::BankSetExchangeRate {
                from: _,
                into: _,
                new_rate: _,
            } => (
                ONE_WEEK_NS,
                &total_supply * E8s::half(),
                E8s::two_thrids(),
                total_supply * E8s::two_thrids(),
                1,
            ),
            VotingKind::HumansEmploy {
                candidate: _,
                hours_a_week_commitment: _,
            } => (
                ONE_WEEK_NS,
                &total_supply * E8s::half(),
                E8s::three_forths(),
                total_supply * E8s::three_forths(),
                1,
            ),
            VotingKind::HumansUnemploy { team_member: _ } => (
                ONE_WEEK_NS * 2,
                &total_supply * E8s::half(),
                E8s::three_forths(),
                total_supply * E8s::three_forths(),
                1,
            ),
        };

        let id = kind.get_id();

        let base = VotingBase::new(
            duration_ns,
            quorum,
            consensus,
            finish_early,
            num_options,
            caller,
            now,
        );

        Self {
            id,
            base,
            kind,
            stage: VotingStage::InProgress,
        }
    }

    pub fn cast_vote(
        &mut self,
        option_idx: u32,
        approval_level: Option<E8s>,
        voter_reputation: E8s,
        caller: Principal,
    ) -> Result<Option<CallToExecute>, VotingEvent> {
        let vote = Vote {
            approval_level,
            total_voter_reputation: voter_reputation,
        };

        self.base.votes_per_option[option_idx as usize].insert(caller, vote);

        if !self.base.is_finish_early_reached_for_all_options() {
            return Ok(None);
        }

        self.stage = VotingStage::Executing;

        let call_or_fail = self.kind.generate_resulting_call(&self.base);

        if let Some(call) = call_or_fail {
            Ok(Some(call))
        } else {
            Err(VotingEvent::VotingFail {
                voting_id: self.id,
                reason: format!("Consensus not reached"),
            })
        }
    }

    pub fn resolve_on_timer(&mut self) -> Result<CallToExecute, VotingEvent> {
        if !self.base.is_quorum_reached_for_all_options() {
            return Err(VotingEvent::VotingFail {
                voting_id: self.id,
                reason: format!("Quorum not reached for all options"),
            });
        }

        self.stage = VotingStage::Executing;

        let call_or_fail = self.kind.generate_resulting_call(&self.base);

        if let Some(call) = call_or_fail {
            Ok(call)
        } else {
            return Err(VotingEvent::VotingFail {
                voting_id: self.id,
                reason: format!("Consensus not reached"),
            });
        }
    }

    pub fn as_ext(&self) -> VotingExt {
        let total_votes_per_option = self
            .base
            .votes_per_option
            .iter()
            .map(|votes| {
                votes
                    .values()
                    .fold(E8s::zero(), |acc, vote| acc + &vote.total_voter_reputation)
            })
            .collect();

        VotingExt {
            id: self.id,
            creator: self.base.creator,
            created_at: self.base.created_at,
            duration_ns: self.base.duration_ns,
            quorum: self.base.quorum.clone(),
            consensus: self.base.consensus.clone(),
            finish_early: self.base.finish_early.clone(),
            total_votes_per_option,
            kind: self.kind.clone(),
            stage: self.stage.clone(),
        }
    }

    pub fn can_cast_vote(&self) -> bool {
        matches!(self.stage, VotingStage::InProgress)
    }

    pub fn can_execute_on_timer(&self) -> bool {
        matches!(self.stage, VotingStage::InProgress)
    }
}

#[derive(CandidType, Deserialize, Clone)]
pub enum VotingStage {
    InProgress,
    Executing,
}

#[derive(CandidType, Deserialize, Validate, Clone)]
pub enum VotingKind {
    FinishEditTask {
        #[garde(skip)]
        task_id: TaskId,
    },
    // can't fail because of not reaching the consensus
    EvaluateTask {
        #[garde(skip)]
        task_id: TaskId,
        #[garde(length(min = 1))]
        solutions: Vec<Principal>,
    },
    BankSetExchangeRate {
        #[garde(skip)]
        from: SwapFrom,
        #[garde(skip)]
        into: SwapInto,
        #[garde(skip)]
        new_rate: E8s,
    },
    HumansEmploy {
        #[garde(skip)]
        candidate: Principal,
        #[garde(skip)]
        hours_a_week_commitment: E8s,
    },
    HumansUnemploy {
        #[garde(skip)]
        team_member: Principal,
    },
}

impl VotingKind {
    pub fn get_id(&self) -> VotingId {
        match self {
            VotingKind::FinishEditTask { task_id } => VotingId::FinishEditTask(*task_id),
            VotingKind::EvaluateTask {
                task_id,
                solutions: _,
            } => VotingId::EvaluateTask(*task_id),
            VotingKind::BankSetExchangeRate {
                from,
                into,
                new_rate: _,
            } => VotingId::BankSetExchangeRate((*from, *into)),
            VotingKind::HumansEmploy {
                candidate,
                hours_a_week_commitment: _,
            } => VotingId::HumansEmploy(*candidate),
            VotingKind::HumansUnemploy { team_member } => VotingId::HumansUnemploy(*team_member),
        }
    }

    pub fn generate_resulting_call(&self, base: &VotingBase) -> Option<CallToExecute> {
        let result = match self {
            VotingKind::FinishEditTask { task_id } => {
                let result = base.calc_binary_results()[0];

                if !result {
                    return None;
                }

                let req = FinishEditTaskRequest { id: *task_id };

                CallToExecute::new(
                    ENV_VARS.tasks_canister_id,
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

                CallToExecute::new(ENV_VARS.tasks_canister_id, "tasks__evaluate".into(), (req,))
            }
            VotingKind::BankSetExchangeRate {
                from,
                into,
                new_rate,
            } => {
                let result = base.calc_binary_results()[0];

                if !result {
                    return None;
                }

                let req = SetExchangeRateRequest {
                    from: *from,
                    into: *into,
                    rate: new_rate.clone(),
                };

                CallToExecute::new(
                    ENV_VARS.bank_canister_id,
                    "bank__set_exchange_rate".into(),
                    (req,),
                )
            }
            VotingKind::HumansEmploy {
                candidate,
                hours_a_week_commitment,
            } => {
                let result = base.calc_binary_results()[0];

                if !result {
                    return None;
                }

                let req = EmployRequest {
                    candidate: *candidate,
                    hours_a_week_commitment: hours_a_week_commitment.clone(),
                };

                CallToExecute::new(ENV_VARS.humans_canister_id, "humans__employ".into(), (req,))
            }
            VotingKind::HumansUnemploy { team_member } => {
                let result = base.calc_binary_results()[0];

                if !result {
                    return None;
                }

                let req = UnemployRequest {
                    team_member: *team_member,
                };

                CallToExecute::new(
                    ENV_VARS.humans_canister_id,
                    "humans__unemploy".into(),
                    (req,),
                )
            }
        };

        let call = result.expect("UNREACHEABLE! Unable to encode args for the call");

        Some(call)
    }
}

#[derive(CandidType, Deserialize, Clone)]
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

#[derive(CandidType, Deserialize, Clone)]
pub struct Vote {
    // None means "Reject"
    pub approval_level: Option<E8s>,
    pub total_voter_reputation: E8s,
}

#[derive(CandidType, Deserialize, Clone)]
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

#[derive(CandidType, Deserialize, Clone)]
pub struct VotingExt {
    pub id: VotingId,
    pub creator: Principal,
    pub created_at: TimestampNs,
    pub duration_ns: DurationNs,
    pub quorum: E8s,
    pub consensus: E8s,
    pub finish_early: E8s,
    pub total_votes_per_option: Vec<E8s>,
    pub kind: VotingKind,
    pub stage: VotingStage,
}

#[derive(CandidType, Deserialize, Clone, Copy)]
pub enum VotingTimer {
    ExecOnQuorum {
        voting_id: VotingId,
        timestamp: TimestampNs,
    },
}

#[derive(CandidType, Deserialize, Clone)]
pub enum VotingEvent {
    VotingCreated {
        voting_id: VotingId,
        creator: Principal,
        quorum: E8s,
        consensus: E8s,
        finish_early: E8s,
        num_options: u32,
    },
    VotingExecuting {
        voting_id: VotingId,
        call: CallToExecute,
        rep_per_option: Vec<E8s>,
        on_timer: bool,
    },
    VotingSuccess {
        voting_id: VotingId,
    },
    VotingFail {
        voting_id: VotingId,
        reason: String,
    },
}
