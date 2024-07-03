import { Countdown } from "@components/countdown";
import { EIconKind, Icon } from "@components/icon";
import { COLORS } from "@utils/colors";
import { TTimestamp } from "@utils/types";
import { Match, Switch } from "solid-js";

export type TVotingStatusStr =
  | "ready"
  | "debouncing"
  | "casting"
  | "casted"
  | "executing";

export interface IVotingStatusProps {
  alreadyVoted: boolean;
  status: TVotingStatusStr;
  createdAt: TTimestamp;
  durationNs: TTimestamp;
}

export function VotingStatus(props: IVotingStatusProps) {
  return (
    <div class="flex p-3 gap-1 items-center">
      <Switch>
        <Match when={props.status === "ready"}>
          <Icon
            kind={EIconKind.ExclamationCircle}
            color={props.alreadyVoted ? COLORS.gray[190] : COLORS.green}
          />
        </Match>

        <Match when={props.status === "debouncing"}>
          <Icon kind={EIconKind.DotsCircle} color={COLORS.gray[190]} />
        </Match>

        <Match when={props.status === "casting"}>
          <Icon kind={EIconKind.CheckDotsCircle} color={COLORS.gray[190]} />
        </Match>

        <Match when={props.status === "casted"}>
          <Icon kind={EIconKind.CheckCircle} color={COLORS.gray[190]} />
        </Match>

        <Match when={props.status === "executing"}>
          <Icon kind={EIconKind.LightningCircle} color={COLORS.darkBlue} />
        </Match>
      </Switch>

      <Countdown
        timestampNs={props.createdAt}
        durationNs={props.durationNs}
        elapsedText="Stand by..."
      />
    </div>
  );
}
