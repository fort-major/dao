import { createContext, createEffect, useContext } from "solid-js";
import { Store, createStore, produce } from "solid-js/store";
import { IChildren, TPrincipalStr, TTaskId, TTimestamp } from "../utils/types";
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
import {
  newLiquidDemocracyActor,
  newVotingsActor,
  opt,
  optUnwrap,
} from "../utils/backend";
import { decodeVotingId, encodeVotingId } from "../utils/encoding";
import { debouncedBatchFetch } from "@utils/common";
import { DecisionTopicId } from "./tasks";
import {
  DecisionTopic,
  DecisionTopicSet,
  DelegationTreeNode,
  GetFolloweesOfRequest,
} from "@/declarations/liquid_democracy/liquid_democracy.did";
import {
  getProfProof,
  getProfProofCert,
  getRepProof,
  getRepProofCert,
} from "@utils/security";

export type TVotingIdStr = string;

export type TVotingKind =
  | {
      HumansEmploy: {
        hours_a_week_commitment: E8s;
        candidate: Principal;
      };
    }
  | { HumansUnemploy: { team_member: Principal } }
  | { EvaluateTask: { task_id: bigint; solutions: Array<Principal> } }
  | { StartSolveTask: { task_id: bigint } }
  | { DeleteTask: { task_id: bigint } }
  | {
      BankSetExchangeRate: {
        from: SwapFrom;
        into: SwapInto;
        new_rate: E8s;
      };
    };

export interface IVote {
  normalized_approval_level?: E8s;
  total_voter_reputation: E8s;
}

export interface IVoting {
  id: TVotingIdStr;
  creator: Principal;
  votesPerOption: Array<[E8s, IVote | undefined]>;
  kind: TVotingKind;
  created_at: TTimestamp;
  stage: VotingStage;
  total_supply: E8s;
  quorum: E8s;
  consensusNormalized: E8s;
  finish_early: E8s;
  duration_ns: bigint;
}

type VotingsStore = Partial<Record<TVotingIdStr, IVoting>>;
type DecisionTopicsStore = Partial<Record<DecisionTopicId, DecisionTopic>>;
type FollowersOfStore = Partial<
  Partial<Record<TPrincipalStr, DelegationTreeNode>>
>;
type FolloweesOfStore = Partial<
  Partial<Record<TPrincipalStr, Record<TPrincipalStr, DecisionTopicSet>>>
>;

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
  createTasksStartSolveVoting: (taskId: TTaskId) => Promise<VotingId>;
  createTasksDeleteVoting: (taskId: TTaskId) => Promise<VotingId>;
  createBankSetExchangeRateVoting: (
    from: SwapFrom,
    into: SwapInto,
    newRate: E8s
  ) => Promise<VotingId>;
  decisionTopics: Store<DecisionTopicsStore>;
  followersOf: Store<FollowersOfStore>;
  fetchFollowersOf: (ids: Principal[]) => Promise<void>;
  followeesOf: Store<FolloweesOfStore>;
  fetchFolloweesOf: (ids: Principal[]) => Promise<void>;
  follow: (id: Principal, topicset: DecisionTopicSet) => Promise<void>;
  unfollow: (id: Principal) => Promise<void>;
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
    isReadyToFetch,
    agent,
    assertAuthorized,
    identity,
  } = useAuth();

  const [votings, setVotings] = createStore<VotingsStore>();
  const [decisionTopics, setDecisionTopics] =
    createStore<DecisionTopicsStore>();
  const [followersOf, setFollowersOf] = createStore<FollowersOfStore>({});
  const [followeesOf, setFolloweesOf] = createStore<FolloweesOfStore>({});

  createEffect(() => {
    if (isReadyToFetch()) {
      fetchDecisionTopics();
    }
  });

  const fetchVotings: IVotingsStoreContext["fetchVotings"] = async (
    ids: VotingId[]
  ) => {
    assertReadyToFetch();

    votingsGetVotings({ ids });
  };

  const castVote: IVotingsStoreContext["castVote"] = async (
    id,
    optionIdx,
    normalizedApprovalLevel
  ) => {
    assertAuthorized();

    const voting = votings[id];

    if (voting === null) {
      err(ErrorCode.UNREACHEABLE, `Voting ${id} does not exist`);
    }

    const votingsActor = newVotingsActor(agent()!);

    const { decision_made } = await votingsActor.votings__cast_vote({
      id: decodeVotingId(id),
      normalized_approval_level:
        normalizedApprovalLevel === null
          ? []
          : [normalizedApprovalLevel.toBigIntRaw()],
      option_idx: optionIdx,
      proof: {
        body: [],
        cert_raw: await getRepProofCert(agent()!),
      },
    });

    return decision_made;
  };

  const createHumansEmployVoting: IVotingsStoreContext["createHumansEmployVoting"] =
    async (candidate, hoursAWeekCommitment) => {
      await assertVotingCanBeCreated(
        encodeVotingId({ HumansEmploy: candidate })
      );

      return startVoting({
        HumansEmploy: {
          candidate,
          hours_a_week_commitment: hoursAWeekCommitment.toBigIntRaw(),
        },
      });
    };

  const createHumansUnemployVoting: IVotingsStoreContext["createHumansUnemployVoting"] =
    async (teamMember) => {
      await assertVotingCanBeCreated(
        encodeVotingId({ HumansUnemploy: teamMember })
      );

      return startVoting({ HumansUnemploy: { team_member: teamMember } });
    };

  const createTasksEvaluateVoting: IVotingsStoreContext["createTasksEvaluateVoting"] =
    async (taskId) => {
      await assertVotingCanBeCreated(encodeVotingId({ EvaluateTask: taskId }));

      return startVoting({ EvaluateTask: { task_id: taskId, solutions: [] } });
    };

  const createTasksStartSolveVoting: IVotingsStoreContext["createTasksStartSolveVoting"] =
    async (taskId) => {
      await assertVotingCanBeCreated(
        encodeVotingId({ StartSolveTask: taskId })
      );

      return startVoting({ StartSolveTask: { task_id: taskId } });
    };

  const createTasksDeleteVoting: IVotingsStoreContext["createTasksDeleteVoting"] =
    async (taskId) => {
      await assertVotingCanBeCreated(encodeVotingId({ DeleteTask: taskId }));

      return startVoting({ DeleteTask: { task_id: taskId } });
    };

  const createBankSetExchangeRateVoting: IVotingsStoreContext["createBankSetExchangeRateVoting"] =
    async (from, into, newRate) => {
      await assertVotingCanBeCreated(
        encodeVotingId({ BankSetExchangeRate: [from, into] })
      );

      return startVoting({
        BankSetExchangeRate: { from, into, new_rate: newRate.toBigIntRaw() },
      });
    };

  const startVoting = async (kind: VotingKind) => {
    const votingsActor = newVotingsActor(agent()!);
    const { id } = await votingsActor.votings__start_voting({
      kind,
      profile_proof: {
        body: [],
        cert_raw: await getProfProofCert(agent()!),
      },
      reputation_proof: {
        body: [],
        cert_raw: await getRepProofCert(agent()!),
      },
    });

    return id;
  };

  const assertVotingCanBeCreated = async (votingId: TVotingIdStr) => {
    assertAuthorized();

    const voting = votings[votingId];

    if (voting) {
      err(ErrorCode.UNREACHEABLE, `Voting ${votingId} already exists`);
    }

    const proof = await getProfProof(agent()!);

    if (!proof.is_team_member) {
      err(ErrorCode.UNREACHEABLE, `Only team members can create votings`);
    }
  };

  const votingsGetVotings = debouncedBatchFetch(
    async function* (req: { ids: VotingId[] }) {
      let a;
      if (agent()) {
        a = agent()!;
      } else {
        a = anonymousAgent()!;
      }

      const votingsActor = newVotingsActor(a);
      return votingsActor.votings__get_votings(req);
    },
    ({ entries: votings }, { ids }) => {
      for (let i = 0; i < votings.length; i++) {
        const voting = optUnwrap(votings[i]);
        const id = encodeVotingId(ids[i]);

        if (!voting) {
          setVotings(id, undefined);
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

        const votesPerOption: Array<[E8s, IVote | undefined]> =
          voting.votes_per_option.map(([total, myVote]) => {
            const v = optUnwrap(myVote);

            if (v) {
              return [
                E8s.new(total),
                {
                  normalized_approval_level: optUnwrap(
                    v.normalized_approval_level.map(E8s.new)
                  ),
                  total_voter_reputation: E8s.new(v.total_voter_reputation),
                },
              ];
            } else {
              return [E8s.new(total), undefined];
            }
          });

        const v: IVoting = {
          id,
          creator: voting.creator,
          created_at: voting.created_at,
          kind,
          stage: voting.stage,
          duration_ns: voting.duration_ns,
          votesPerOption,
          total_supply: E8s.new(voting.total_supply),
          quorum: E8s.new(voting.quorum),
          consensusNormalized: E8s.new(voting.consensus_normalized),
          finish_early: E8s.new(voting.finish_early),
        };

        setVotings(id, v);
      }
    },
    (reason) => err(ErrorCode.NETWORK, `Unable to fetch votings: ${reason}`)
  );

  const fetchDecisionTopics = async () => {
    assertReadyToFetch();

    const liquidDemocracyActor = newLiquidDemocracyActor(anonymousAgent()!);

    const { entries: topics } =
      await liquidDemocracyActor.liquid_democracy__get_decision_topics({});

    const t = topics.reduce(
      (prev, topic) => Object.assign(prev, { [topic.id]: topic }),
      {}
    );

    setDecisionTopics(t);
  };

  const liquidDemocracyGetFollowersOf = debouncedBatchFetch(
    async function* (req: GetFolloweesOfRequest) {
      const liquidDemocracyActor = newLiquidDemocracyActor(anonymousAgent()!);
      return liquidDemocracyActor.liquid_democracy__get_followers_of(req);
    },
    ({ entries }, req) => {
      for (let i = 0; i < req.ids.length; i++) {
        setFollowersOf(req.ids[i].toText(), entries[i]);
      }
    },
    (e) => err(ErrorCode.NETWORK, `Unable to fetch followers of: ${e}`)
  );

  const liquidDemocracyGetFolloweesOf = debouncedBatchFetch(
    async function* (req: GetFolloweesOfRequest) {
      const liquidDemocracyActor = newLiquidDemocracyActor(anonymousAgent()!);
      return liquidDemocracyActor.liquid_democracy__get_followees_of(req);
    },
    ({ entries }, req) => {
      for (let i = 0; i < req.ids.length; i++) {
        let id = req.ids[i].toText();

        const f = entries[i].reduce((prev, [followee, topicset]) => {
          prev[followee.toText()] = topicset;

          return prev;
        }, {} as Record<string, DecisionTopicSet>);

        setFolloweesOf(id, f);
      }
    },
    (e) => err(ErrorCode.NETWORK, `Unable to fetch followees of: ${e}`)
  );

  const fetchFollowersOf: IVotingsStoreContext["fetchFollowersOf"] = async (
    ids
  ) => {
    assertReadyToFetch();

    liquidDemocracyGetFollowersOf({ ids });
  };

  const fetchFolloweesOf: IVotingsStoreContext["fetchFolloweesOf"] = async (
    ids
  ) => {
    assertReadyToFetch();

    liquidDemocracyGetFolloweesOf({ ids });
  };

  const follow: IVotingsStoreContext["follow"] = async (id, topicset) => {
    assertAuthorized();

    const actor = newLiquidDemocracyActor(agent()!);
    await actor.liquid_democracy__follow({
      followee: id,
      topics: [topicset],
      proof: {
        body: [],
        cert_raw: await getRepProofCert(agent()!),
      },
    });
  };

  const unfollow: IVotingsStoreContext["unfollow"] = async (id) => {
    assertAuthorized();

    const actor = newLiquidDemocracyActor(agent()!);
    await actor.liquid_democracy__follow({
      followee: id,
      topics: [],
      proof: {
        body: [],
        cert_raw: await getRepProofCert(agent()!),
      },
    });

    const me = identity()!.getPrincipal();
    setFolloweesOf(
      me.toText(),
      produce((myFollowees) => {
        delete myFollowees?.[id.toText()];
      })
    );
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
        createTasksStartSolveVoting: createTasksStartSolveVoting,
        createBankSetExchangeRateVoting,
        createTasksDeleteVoting,
        decisionTopics,
        followersOf,
        fetchFollowersOf,
        followeesOf,
        fetchFolloweesOf,
        follow,
        unfollow,
      }}
    >
      {props.children}
    </VotingsContext.Provider>
  );
}
