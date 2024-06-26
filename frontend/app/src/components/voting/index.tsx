import { Match, Show, Switch, createSignal, onMount } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import { VotingId } from "../../declarations/votings/votings.did";
import { IVoting, TVotingIdStr, useVotings } from "../../store/votings";
import { decodeVotingId, encodeVotingId } from "../../utils/encoding";
import { useAuth } from "../../store/auth";
import { E8s } from "../../utils/math";
import { eventHandler } from "../../utils/security";
import { Btn } from "../btn";

export interface IVotingWidgetProps {
  view: "binary" | "rating" | "raw";
  voting?: IVoting;
  optionIdx: number;
}

export function VotingWidget(props: IVotingWidgetProps) {
  const { castVote } = useVotings();
  const { profileProof } = useAuth();
  const [castingStatus, setCastingStatus] = createSignal<
    "Action required" | "Waiting confirmation" | "Casting the vote..." | "Voted"
  >("Action required");

  const myVote = () => props.voting?.votesPerOption?.[props.optionIdx][1];

  const [approvalLevel, setApprovalLevel] = createSignal<E8s | null>(
    myVote()?.normalized_approval_level ?? E8s.one()
  );

  const canVote = () => {
    const r = rep();
    if (!r || r.isZero()) return false;

    return true;
  };
  const rep = () => profileProof()?.reputation;
  const status = () => {
    const v = props.voting;

    if (!v) return "N/A";

    if ("InProgress" in v.stage) {
      return castingStatus();
    }

    if ("Executing" in v.stage) {
      return "Processing results";
    }
  };

  const castVoteDebounced = debounce(async () => {
    setCastingStatus("Casting the vote...");
    await castVote(props.voting!.id, props.optionIdx, approvalLevel());
    setCastingStatus("Voted");
  }, 1000);

  const handleSliderChange = eventHandler(
    (e: Event & { target: HTMLInputElement }) => {
      setApprovalLevel(E8s.fromPercentNum(parseInt(e.target.value)));
      setCastingStatus("Waiting confirmation");

      castVoteDebounced();
    }
  );

  const handleReject = () => {
    setApprovalLevel(null);
    setCastingStatus("Waiting confirmation");

    castVoteDebounced();
  };

  return (
    <Show when={props.voting} fallback={<VotingWidgetSkeleton />}>
      <div>
        <Btn disabled={!canVote()} text="Reject" onClick={handleReject} />
        <Switch>
          <Match when={props.view === "raw"}>
            <input
              type="range"
              disabled={!canVote()}
              onChange={handleSliderChange}
              value={myVote()?.normalized_approval_level?.toPercentNum() ?? 100}
            />
          </Match>
        </Switch>
        <p>{status()}</p>
      </div>
    </Show>
  );
}

export function VotingWidgetSkeleton() {
  return <div>Loading...</div>;
}
