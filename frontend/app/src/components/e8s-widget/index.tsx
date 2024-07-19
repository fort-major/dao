import { EIconKind, Icon } from "@components/icon";
import { MetricWidget } from "@components/metric-widget";
import { E8s } from "@utils/math";
import { IClass } from "@utils/types";

export enum EE8sKind {
  FMJ = "FMJ",
  ICP = "ICP",
  Storypoint = "Storypoint",
  Hour = "Hour",
  Reputation = "Reputation",
}

export interface IE8sWidgetProps extends IClass {
  minValue: E8s;
  maxValue?: E8s;
  kind: EE8sKind;
  white?: boolean;
  disallowEmptyTail?: boolean;
}

export function E8sWidget(props: IE8sWidgetProps) {
  const iconKind = () =>
    props.kind === EE8sKind.FMJ
      ? EIconKind.FMJ
      : props.kind === EE8sKind.ICP
      ? EIconKind.ICP
      : props.kind === EE8sKind.Storypoint
      ? EIconKind.Storypoint
      : props.kind === EE8sKind.Reputation
      ? EIconKind.Reputation
      : EIconKind.Hour;

  const value = () => {
    if (props.maxValue && !props.maxValue.isZero()) {
      return `${props.minValue.toString()} to ${props.minValue
        .add(props.maxValue)
        .toString()}`;
    } else {
      return props.minValue.toString();
    }
  };

  return (
    <div class={`flex items-center gap-1 ${props.class ? props.class : ""}`}>
      <Icon kind={iconKind()} />
      <MetricWidget
        white={props.white}
        primary={value()}
        secondary={props.kind}
      />
    </div>
  );
}
