import { COLORS } from "@utils/colors";
import { E8s } from "@utils/math";
import { Show } from "solid-js";

export interface IVotingProgressBarProps {
  totalSupply: E8s;
  totalVoted: E8s;
  quorum: E8s;
  finishEarly: E8s;
  myRep?: E8s;
  alreadyVoted: boolean;
}

export function VotingProgressBar(props: IVotingProgressBarProps) {
  const totalVotedPercent = () =>
    props.totalVoted.div(props.totalSupply).toPercentNum();
  const quorumPercent = () =>
    props.quorum.div(props.totalSupply).toPercentNum();
  const finishEarlyPercent = () =>
    props.finishEarly.div(props.totalSupply).toPercentNum();
  const myRepPercent = () =>
    props.myRep
      ? props.myRep.div(props.totalSupply).toPercentNum() || 1
      : undefined;

  const totalVotedColor = () =>
    props.totalVoted.ge(props.finishEarly)
      ? COLORS.blue
      : props.totalVoted.ge(props.quorum)
      ? COLORS.green
      : COLORS.gray[150];

  const quorumColor = () =>
    props.totalVoted.ge(props.quorum) ? COLORS.gray[150] : COLORS.green;
  const finishEarlyColor = () =>
    props.totalVoted.ge(props.finishEarly) ? COLORS.gray[150] : COLORS.blue;

  return (
    <div class="w-full h-1 bg-black relative overflow-hidden">
      <div
        class="h-1 absolute"
        style={{
          width: `${totalVotedPercent()}%`,
          left: 0,
          "background-color": totalVotedColor(),
        }}
      ></div>
      <Show when={myRepPercent()}>
        <div
          class="bg-gray-190 h-1 absolute animate-pulse"
          style={{
            width: `${myRepPercent()}%`,
            left: props.alreadyVoted ? 0 : `${totalVotedPercent()}%`,
          }}
        ></div>
      </Show>

      <div
        class="h-1 w-1 absolute"
        style={{
          left: `${quorumPercent()}%`,
          "background-color": quorumColor(),
        }}
      ></div>
      <div
        class="h-1 w-1 absolute"
        style={{
          left: `${finishEarlyPercent()}%`,
          "background-color": finishEarlyColor(),
        }}
      ></div>
    </div>
  );
}
