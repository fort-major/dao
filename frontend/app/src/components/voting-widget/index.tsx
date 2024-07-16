import { VotingStage } from "@/declarations/votings/votings.did";
import { VotingInput } from "@components/voting-input";
import { VotingProgressBar } from "@components/voting-progress-bar";
import { TVotingStatusStr, VotingStatus } from "@components/voting-status";
import { useAuth } from "@store/auth";
import { IVote, IVoting, TVotingIdStr, useVotings } from "@store/votings";
import { debounce } from "@utils/common";
import { decodeVotingId } from "@utils/encoding";
import { E8s } from "@utils/math";
import { eventHandler, getRepProof, totalDelegatedRep } from "@utils/security";
import { Result, TTimestamp } from "@utils/types";
import {
  batch,
  createEffect,
  createMemo,
  createResource,
  createSignal,
} from "solid-js";

export interface IVotingWidgetProps {
  id: TVotingIdStr;
  optionIdx: number;
  kind: "binary" | "satisfaction" | "evaluation";
  class?: string;
  onRefreshEntity?: () => void;
}

function stageToStatus(
  stage: VotingStage,
  substage?: "debouncing" | "casting" | "casted"
): TVotingStatusStr {
  if ("InProgress" in stage) {
    if (substage) return substage;
    return "ready";
  }

  return "executing";
}

export function VotingWidget(props: IVotingWidgetProps) {
  const { isReadyToFetch, agent } = useAuth();
  const { castVote, votings, fetchVotings } = useVotings();

  const [repProof] = createResource(agent, getRepProof);
  const [newVote, setNewVote] = createSignal<E8s | undefined | null>();
  const [status, setStatus] = createSignal<TVotingStatusStr>("casting");
  const [hovered, setHovered] = createSignal(false);

  const voting = () => votings[props.id];
  const myVote = () => voting()?.votesPerOption[props.optionIdx][1];
  const totalVoted = () => voting()?.votesPerOption[props.optionIdx][0];

  const myVoteTriggersFinishEarly = createMemo(() => {
    const v = voting();
    const t = totalVoted();
    const rep = repProof();

    if (!v || !t || !rep) return false;

    const myPrevV = myVote();
    // don't trigger on re-vote
    if (myPrevV) return false;

    const myCur = E8s.new(totalDelegatedRep(rep.reputation_delegation_tree));

    return v.finish_early.le(myCur.add(t));
  });

  createEffect(() => {
    const v = voting();

    if (!v && isReadyToFetch()) {
      fetchVotings([decodeVotingId(props.id)]);
    } else if (v) {
      setStatus(stageToStatus(v.stage));
    }
  });

  const isDisabled = () => {
    const p = repProof();
    if (!p || !voting()) return true;

    return (
      p.reputation_delegation_tree.reputation === 0n ||
      !["ready", "debouncing"].includes(status())
    );
  };

  const handleMouseEnter = eventHandler(() => {
    setHovered(true);
  });

  const handleMouseLeave = eventHandler(() => {
    setHovered(false);
  });

  const castVoteDebounced = debounce(async (args: [E8s | null]) => {
    const v = voting()!;

    setStatus(stageToStatus(v.stage, "casting"));

    await castVote(props.id, props.optionIdx, args[0]);

    if (myVoteTriggersFinishEarly()) {
      props.onRefreshEntity?.();
    }

    setStatus(stageToStatus(v.stage, "casted"));

    setTimeout(() => {
      batch(() => {
        setNewVote(undefined);
        setStatus(stageToStatus(v.stage));
      });
    }, 1000);

    fetchVotings([decodeVotingId(props.id)]);
  }, 1000);

  const handleCastVote = (approval: Result<E8s | null>) => {
    if (isDisabled()) return;

    setNewVote(approval.unwrapOk());
    castVoteDebounced(approval.unwrapOk());
    setStatus(stageToStatus(voting()!.stage, "debouncing"));
  };

  return (
    <div
      class="flex flex-col"
      classList={{ [props.class!]: !!props.class }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div class="flex justify-between">
        <VotingInput
          kind={props.kind}
          reset={hovered()}
          value={
            newVote() === undefined
              ? myVote() === undefined
                ? E8s.zero()
                : myVote()!.normalized_approval_level!
              : (newVote() as E8s | null)
          }
          onChange={handleCastVote}
          disabled={isDisabled()}
        />
        <VotingStatus
          status={status()}
          alreadyVoted={myVote() !== undefined}
          createdAt={voting()?.created_at ?? 0n}
          durationNs={voting()?.duration_ns ?? 0n}
        />
      </div>
      <VotingProgressBar
        alreadyVoted={myVote() !== undefined}
        totalSupply={voting()?.total_supply ?? E8s.one()}
        totalVoted={totalVoted() ?? E8s.one()}
        quorum={voting()?.quorum ?? E8s.one()}
        finishEarly={voting()?.finish_early ?? E8s.one()}
        myRep={
          repProof()
            ? E8s.new(repProof()!.reputation_delegation_tree.reputation)
            : undefined
        }
      />
    </div>
  );
}
