import {
  HttpAgent,
  Identity,
  AnonymousIdentity,
  Agent,
  Actor,
} from "@fort-major/agent-js-fork";
import {
  _SERVICE as BankActor,
  idlFactory as BankIdlFactory,
} from "../declarations/bank/bank.did";
import {
  _SERVICE as FmjActor,
  idlFactory as FmjIdlFactory,
} from "../declarations/fmj/fmj.did";
export type { _SERVICE as FmjActor } from "../declarations/fmj/fmj.did";
import {
  _SERVICE as HumansActor,
  idlFactory as HumansIdlFactory,
} from "../declarations/humans/humans.did";
import {
  _SERVICE as TasksActor,
  idlFactory as TasksIdlFactory,
} from "../declarations/tasks/tasks.did";
import {
  _SERVICE as TaskArchiveActor,
  idlFactory as TaskArchiveIdlFactory,
} from "../declarations/task_archive/task_archive.did";
import {
  _SERVICE as VotingsActor,
  idlFactory as VotingsIdlFactory,
} from "../declarations/votings/votings.did";
import {
  _SERVICE as ReputationActor,
  idlFactory as ReputationIdlFactory,
} from "../declarations/reputation/reputation.did";
import {
  _SERVICE as LiquidDemocracyActor,
  idlFactory as LiquidDemocracyIdlFactory,
} from "../declarations/liquid_democracy/liquid_democracy.did";
import {
  _SERVICE as WorkReportsActor,
  idlFactory as WorkReportsIdlFactory,
} from "../declarations/work_reports/work_reports.did";
import { Principal } from "@dfinity/principal";
import { ErrorCode, logErr } from "./error";
import { debugStringify } from "./encoding";

export function newBankActor(agent: Agent): BankActor {
  return Actor.createActor(BankIdlFactory, {
    canisterId: import.meta.env.VITE_BANK_CANISTER_ID,
    agent,
  });
}

export function newFmjActor(agent: Agent): FmjActor {
  return Actor.createActor(FmjIdlFactory, {
    canisterId: import.meta.env.VITE_FMJ_CANISTER_ID,
    agent,
  });
}

export function newIcpActor(agent: Agent): FmjActor {
  return Actor.createActor(FmjIdlFactory, {
    canisterId: import.meta.env.VITE_ICP_CANISTER_ID,
    agent,
  });
}

export function newHumansActor(agent: Agent): HumansActor {
  return Actor.createActor(HumansIdlFactory, {
    canisterId: import.meta.env.VITE_HUMANS_CANISTER_ID,
    agent,
  });
}

export function newTasksActor(agent: Agent): TasksActor {
  return Actor.createActor(TasksIdlFactory, {
    canisterId: import.meta.env.VITE_TASKS_CANISTER_ID,
    agent,
  });
}

export function newTaskArchiveActor(
  agent: Agent,
  canisterId: Principal = Principal.fromText(
    import.meta.env.VITE_TASKS_CANISTER_ID
  )
): TaskArchiveActor {
  return Actor.createActor(TaskArchiveIdlFactory, {
    canisterId,
    agent,
  });
}

export function newVotingsActor(agent: Agent): VotingsActor {
  return Actor.createActor(VotingsIdlFactory, {
    canisterId: import.meta.env.VITE_VOTINGS_CANISTER_ID,
    agent,
  });
}

export function newReputationActor(agent: Agent): ReputationActor {
  return Actor.createActor(ReputationIdlFactory, {
    canisterId: import.meta.env.VITE_REPUTATION_CANISTER_ID,
    agent,
  });
}

export function newLiquidDemocracyActor(agent: Agent): LiquidDemocracyActor {
  return Actor.createActor(LiquidDemocracyIdlFactory, {
    canisterId: import.meta.env.VITE_LIQUID_DEMOCRACY_CANISTER_ID,
    agent,
  });
}

export function newWorkReportsActor(agent: Agent): WorkReportsActor {
  return Actor.createActor(WorkReportsIdlFactory, {
    canisterId: import.meta.env.VITE_WORK_REPORTS_CANISTER_ID,
    agent,
  });
}

export async function makeAgent(
  identity?: Identity | undefined
): Promise<Agent> {
  const agent = new HttpAgent({
    host: import.meta.env.VITE_IC_HOST,
    identity,
    retryTimes: 10,
  });

  if (import.meta.env.DEV) {
    await agent.fetchRootKey();
  }

  return agent;
}

export async function makeAnonymousAgent(): Promise<Agent> {
  const id = new AnonymousIdentity();
  return makeAgent(id);
}

export function optUnwrap<T>(it: [] | [T] | T[]): T | undefined {
  return it.length > 0 ? it[0] : undefined;
}

export function opt<T>(it: T | undefined): [] | [T] {
  return it ? [it] : [];
}
