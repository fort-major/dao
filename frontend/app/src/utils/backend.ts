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
import {
  _SERVICE as HumansActor,
  idlFactory as HumansIdlFactory,
} from "../declarations/humans/humans.did";
import {
  _SERVICE as TasksActor,
  idlFactory as TasksIdlFactory,
} from "../declarations/tasks/tasks.did";
import {
  _SERVICE as VotingsActor,
  idlFactory as VotingsIdlFactory,
} from "../declarations/votings/votings.did";

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

export function newVotingsActor(agent: Agent): VotingsActor {
  return Actor.createActor(VotingsIdlFactory, {
    canisterId: import.meta.env.VITE_VOTINGS_CANISTER_ID,
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

export function optUnwrap<T>(it: [] | [T]): T | undefined {
  return it[0] ? it[0] : undefined;
}
