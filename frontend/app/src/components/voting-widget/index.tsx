import { VotingStage } from "@/declarations/votings/votings.did";
import { Title } from "@components/title";
import { VotingInput } from "@components/voting-input";
import { VotingProgressBar } from "@components/voting-progress-bar";
import { TVotingStatusStr, VotingStatus } from "@components/voting-status";
import { useAuth } from "@store/auth";
import { IVote, IVoting, TVotingIdStr, useVotings } from "@store/votings";
import { debounce } from "@utils/common";
import { decodeVotingId } from "@utils/encoding";
import { err, ErrorCode } from "@utils/error";
import { E8s } from "@utils/math";
import { eventHandler, getRepProof, totalDelegatedRep } from "@utils/security";
import { Result, TTimestamp } from "@utils/types";
import {
  batch,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  Show,
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
  const { isReadyToFetch, isAuthorized, agent } = useAuth();
  const { castVote, votings, fetchVotings } = useVotings();

  const [repProof] = createResource(agent, getRepProof);
  const [newVote, setNewVote] = createSignal<E8s | undefined | null>();
  const [status, setStatus] = createSignal<TVotingStatusStr>("casting");
  const [hovered, setHovered] = createSignal(false);

  const voting = () => votings[props.id];
  const myVote = () => voting()?.votesPerOption[props.optionIdx][1];
  const totalVoted = () => voting()?.votesPerOption[props.optionIdx][0];

  const votingKindText = () => {
    const v = voting();
    if (!v) return undefined;

    if ("StartSolveTask" in v.kind) {
      return "Vote to start the Solving Phase";
    }

    if ("EvaluateTask" in v.kind) {
      return "Evaluate the solution";
    }

    if ("BankSetExchangeRate" in v.kind) {
      return `Vote to set new exchange rate to ${v.kind.BankSetExchangeRate.new_rate.toString()}`;
    }

    if ("HumansEmploy" in v.kind) {
      return `Vote to admit the human into the team with commitment of ${v.kind.HumansEmploy.hours_a_week_commitment.toString()} h/w`;
    }

    if ("HumansUnemploy" in v.kind) {
      return "Vote to expel the human from the team";
    }

    err(ErrorCode.UNREACHEABLE, "Unknown voting kind");
  };

  createEffect(() => {
    const v = voting();

    if (!v && isReadyToFetch()) {
      fetchVotings([decodeVotingId(props.id)]);
    }
  });

  createEffect(
    on(isAuthorized, (ready) => {
      if (ready) {
        fetchVotings([decodeVotingId(props.id)]);
      }
    })
  );

  createEffect(
    on(voting, (v) => {
      if (v) {
        setStatus(stageToStatus(v.stage));
      }
    })
  );

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

    const decisionMade = await castVote(props.id, props.optionIdx, args[0]);

    if (decisionMade) {
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
      <Show when={votingKindText()}>
        <Title text={votingKindText()!} />
      </Show>
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
            ? E8s.new(totalDelegatedRep(repProof()!.reputation_delegation_tree))
            : undefined
        }
      />
    </div>
  );
}
