import { createContext, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TTaskId, TTimestamp } from "../utils/types";
import { ErrorCode, err } from "../utils/error";
import { Principal } from "@dfinity/principal";
import { useAuth } from "./auth";
import { E8s } from "../utils/math";
import {
  SwapFrom,
  SwapInto,
  VotingId,
  VotingKind,
  VotingStage,
} from "../declarations/votings/votings.did";
import { newVotingsActor, optUnwrap } from "../utils/backend";
import { decodeVotingId, encodeVotingId } from "../utils/encoding";

export type TVotingKind =
  | {
      HumansEmploy: {
        hours_a_week_commitment: E8s;
        candidate: Principal;
      };
    }
  | { HumansUnemploy: { team_member: Principal } }
  | { EvaluateTask: { task_id: bigint; solutions: Array<Principal> } }
  | { FinishEditTask: { task_id: bigint } }
  | {
      BankSetExchangeRate: {
        from: SwapFrom;
        into: SwapInto;
        new_rate: E8s;
      };
    };

export interface IVoting {
  id: TVotingIdStr;
  creator: Principal;
  totalVotesPerOption: Array<E8s>;
  kind: TVotingKind;
  created_at: TTimestamp;
  stage: VotingStage;
  quorum: E8s;
  consensusNormalized: E8s;
  finish_early: E8s;
  duration_ns: bigint;
}

type TVotingIdStr = string;
// explicit null means that the voting does not exist
type VotingsStore = Record<TVotingIdStr, IVoting | null>;

export interface IVotingsStoreContext {
  votings: Store<VotingsStore>;
  fetchVotings: (ids: VotingId[]) => Promise<void>;
  castVote: (
    id: TVotingIdStr,
    optionIdx: number,
    normalizedApprovalLevel: E8s | null // 0.0 ... 1.0, null means 'reject'
  ) => Promise<boolean>;
  createHumansEmployVoting: (
    candidate: Principal,
    hoursAWeekCommitment: E8s
  ) => Promise<VotingId>;
  createHumansUnemployVoting: (teamMember: Principal) => Promise<VotingId>;
  createTasksEvaluateVoting: (taskId: TTaskId) => Promise<VotingId>;
  createTasksFinishEditVoting: (taskId: TTaskId) => Promise<VotingId>;
  createBankSetExchangeRateVoting: (
    from: SwapFrom,
    into: SwapInto,
    newRate: E8s
  ) => Promise<VotingId>;
}

const VotingsContext = createContext<IVotingsStoreContext>();

export function useVotings(): IVotingsStoreContext {
  const ctx = useContext(VotingsContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Votings context is not initialized");
  }

  return ctx;
}

export function VotingsStore(props: IChildren) {
  const {
    anonymousAgent,
    assertReadyToFetch,
    profileProofCert,
    profileProof,
    agent,
    assertAuthorized,
    assertWithProof,
  } = useAuth();

  const [votings, setVotings] = createStore<VotingsStore>();

  const fetchVotings: IVotingsStoreContext["fetchVotings"] = async (
    ids: VotingId[]
  ) => {
    assertReadyToFetch();

    const votingsActor = newVotingsActor(anonymousAgent()!);
    const { votings } = await votingsActor.votings__get_votings({ ids });

    for (let i = 0; i < votings.length; i++) {
      const voting = optUnwrap(votings[i]);
      const id = encodeVotingId(ids[i]);

      if (!voting) {
        setVotings(id, null);
        continue;
      }

      let kind: TVotingKind;

      if ("HumansEmploy" in voting.kind) {
        const k = voting.kind.HumansEmploy;

        kind = {
          HumansEmploy: {
            hours_a_week_commitment: E8s.new(k.hours_a_week_commitment),
            candidate: k.candidate,
          },
        };
      } else if ("BankSetExchangeRate" in voting.kind) {
        const k = voting.kind.BankSetExchangeRate;

        kind = {
          BankSetExchangeRate: {
            from: k.from,
            into: k.into,
            new_rate: E8s.new(k.new_rate),
          },
        };
      } else {
        kind = voting.kind;
      }

      const v: IVoting = {
        id,
        creator: voting.creator,
        created_at: voting.created_at,
        kind,
        stage: voting.stage,
        duration_ns: voting.duration_ns,
        totalVotesPerOption: voting.total_votes_per_option.map(E8s.new),
        quorum: E8s.new(voting.quorum),
        consensusNormalized: E8s.new(voting.consensus_normalized),
        finish_early: E8s.new(voting.finish_early),
      };

      setVotings(id, v);
    }
  };

  const castVote: IVotingsStoreContext["castVote"] = async (
    id,
    optionIdx,
    normalizedApprovalLevel
  ) => {
    assertAuthorized();
    assertWithProof();

    const voting = votings[id];

    if (voting === null) {
      err(ErrorCode.UNREACHEABLE, `Voting ${id} does not exist`);
    }

    const proof = profileProof()!;

    if (proof.reputation.isZero()) {
      err(ErrorCode.AUTH, "You need at least some reputation to cast a vote");
    }

    const approvalLevel: [bigint] | [] = normalizedApprovalLevel
      ? [normalizedApprovalLevel.mul(proof.reputation).toBigInt()]
      : [];

    const votingsActor = newVotingsActor(agent()!);

    const { decision_made } = await votingsActor.votings__cast_vote({
      id: decodeVotingId(id),
      approval_level: approvalLevel,
      option_idx: optionIdx,
      proof: { cert_raw: profileProofCert()!, profile_proof: [] },
    });

    return decision_made;
  };

  const createHumansEmployVoting: IVotingsStoreContext["createHumansEmployVoting"] =
    async (candidate, hoursAWeekCommitment) => {
      assertVotingCanBeCreated(encodeVotingId({ HumansEmploy: candidate }));

      return startVoting({
        HumansEmploy: {
          candidate,
          hours_a_week_commitment: hoursAWeekCommitment.toBigInt(),
        },
      });
    };

  const createHumansUnemployVoting: IVotingsStoreContext["createHumansUnemployVoting"] =
    async (teamMember) => {
      assertVotingCanBeCreated(encodeVotingId({ HumansUnemploy: teamMember }));

      return startVoting({ HumansUnemploy: { team_member: teamMember } });
    };

  const createTasksEvaluateVoting: IVotingsStoreContext["createTasksEvaluateVoting"] =
    async (taskId) => {
      assertVotingCanBeCreated(encodeVotingId({ EvaluateTask: taskId }));

      return startVoting({ EvaluateTask: { task_id: taskId, solutions: [] } });
    };

  const createTasksFinishEditVoting: IVotingsStoreContext["createTasksFinishEditVoting"] =
    async (taskId) => {
      assertVotingCanBeCreated(encodeVotingId({ FinishEditTask: taskId }));

      return startVoting({ FinishEditTask: { task_id: taskId } });
    };

  const createBankSetExchangeRateVoting: IVotingsStoreContext["createBankSetExchangeRateVoting"] =
    async (from, into, newRate) => {
      assertVotingCanBeCreated(
        encodeVotingId({ BankSetExchangeRate: [from, into] })
      );

      return startVoting({
        BankSetExchangeRate: { from, into, new_rate: newRate.toBigInt() },
      });
    };

  const startVoting = async (kind: VotingKind) => {
    const votingsActor = newVotingsActor(agent()!);
    const { id } = await votingsActor.votings__start_voting({
      kind,
      proof: {
        cert_raw: profileProofCert()!,
        profile_proof: [],
      },
    });

    return id;
  };

  const assertVotingCanBeCreated = (votingId: TVotingIdStr) => {
    assertAuthorized();
    assertWithProof();

    const voting = votings[votingId];

    if (voting) {
      err(ErrorCode.UNREACHEABLE, `Voting ${votingId} already exists`);
    }

    const proof = profileProof()!;

    if (!proof.is_team_member) {
      err(ErrorCode.UNREACHEABLE, `Only team members can create votings`);
    }
  };

  return (
    <VotingsContext.Provider
      value={{
        votings,
        fetchVotings,
        castVote,
        createHumansEmployVoting,
        createHumansUnemployVoting,
        createTasksEvaluateVoting,
        createTasksFinishEditVoting,
        createBankSetExchangeRateVoting,
      }}
    >
      {props.children}
    </VotingsContext.Provider>
  );
}
