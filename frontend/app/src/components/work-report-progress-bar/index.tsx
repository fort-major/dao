import { EIconKind, Icon } from "@components/icon";
import { COLORS } from "@utils/colors";
import { E8s } from "@utils/math";
import { Show } from "solid-js";

export interface IWorkReportProgressBarProps {
  totalSupply: E8s;
  totalVoted: E8s;
  totalCalledSpam: E8s;
  finishEarly: E8s;
}

export function WorkReportProgressBar(props: IWorkReportProgressBarProps) {
  const totalVotedPercent = () =>
    props.totalVoted.div(props.totalSupply).toPercentNum() / 2;
  const totalCalledSpamPercent = () =>
    props.totalCalledSpam.div(props.totalSupply).toPercentNum() / 2;
  const finishEarlyPercent = () =>
    props.finishEarly.div(props.totalSupply).toPercentNum() / 2;

  return (
    <div class="flex items-center gap-2">
      <Icon kind={EIconKind.ThumbUp} color={COLORS.green} />
      <div class="w-full h-1 bg-black relative overflow-hidden">
        <div
          class="h-1 absolute"
          style={{
            width: `${totalVotedPercent()}%`,
            left: 0,
            "background-color": COLORS.green,
          }}
        ></div>

        <div
          class="h-1 absolute"
          style={{
            width: `${totalCalledSpamPercent()}%`,
            right: 0,
            "background-color": COLORS.errorRed,
          }}
        ></div>

        <div
          class="h-1 w-[2px] absolute"
          style={{
            left: `${finishEarlyPercent()}%`,
            "background-color": COLORS.green,
          }}
        ></div>
        <div
          class="h-1 w-[2px] absolute"
          style={{
            right: `${finishEarlyPercent()}%`,
            "background-color": COLORS.errorRed,
          }}
        ></div>
      </div>
      <Icon kind={EIconKind.ThumbDown} color={COLORS.errorRed} />
    </div>
  );
}
