import { VotingStage } from "@/declarations/votings/votings.did";
import { VotingInput } from "@components/voting-input";
import { VotingProgressBar } from "@components/voting-progress-bar";
import { TVotingStatusStr, VotingStatus } from "@components/voting-status";
import { useAuth } from "@store/auth";
import { IVote, IVoting, TVotingIdStr, useVotings } from "@store/votings";
import { debounce } from "@utils/common";
import { E8s } from "@utils/math";
import { eventHandler } from "@utils/security";
import { Result, TTimestamp } from "@utils/types";
import { createSignal } from "solid-js";

export interface IVotingWidgetProps {
  id: TVotingIdStr;
  optionIdx: number;
  createdAt: TTimestamp;
  durationNs: TTimestamp;
  totalVoted: E8s;
  myVote?: E8s | null;
  stage: VotingStage;
  totalSupply: E8s;
  quorum: E8s;
  finishEarly: E8s;
  kind: "binary" | "satisfaction" | "evaluation";
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
  const { reputationProof } = useAuth();
  const { castVote } = useVotings();

  const [newVote, setNewVote] = createSignal<E8s | undefined | null>();
  const [status, setStatus] = createSignal<TVotingStatusStr>(
    stageToStatus(props.stage)
  );
  const [hovered, setHovered] = createSignal(false);

  const isDisabled = () =>
    !reputationProof() ||
    reputationProof()!.reputation.isZero() ||
    !["ready", "debouncing"].includes(status());

  const handleMouseEnter = eventHandler(() => {
    setHovered(true);
  });

  const handleMouseLeave = eventHandler(() => {
    setHovered(false);
  });

  const castVoteDebounced = debounce((approval: E8s | null) => {
    setStatus(stageToStatus(props.stage, "casting"));

    castVote(props.id, props.optionIdx, approval).then(() => {
      setStatus(stageToStatus(props.stage, "casted"));

      setTimeout(() => {
        setNewVote(undefined);
        setStatus(stageToStatus(props.stage));
      }, 1000);
    });
  }, 1500);

  const handleCastVote = (approval: Result<E8s | null>) => {
    setNewVote(approval.unwrapOk());
    castVoteDebounced(approval);
    setStatus(stageToStatus(props.stage, "debouncing"));
  };

  return (
    <div
      class="flex flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div class="flex justify-between">
        <VotingInput
          kind={props.kind}
          reset={hovered()}
          value={
            newVote() === undefined
              ? props.myVote === undefined
                ? E8s.zero()
                : props.myVote
              : (newVote() as E8s | null)
          }
          onChange={handleCastVote}
          disabled={isDisabled()}
        />
        <VotingStatus
          status={status()}
          alreadyVoted={props.myVote !== undefined}
          createdAt={props.createdAt}
          durationNs={props.durationNs}
        />
      </div>
      <VotingProgressBar
        alreadyVoted={props.myVote !== undefined}
        totalSupply={props.totalSupply}
        totalVoted={props.totalVoted}
        quorum={props.quorum}
        finishEarly={props.finishEarly}
        myRep={reputationProof()?.reputation}
      />
    </div>
  );
}
