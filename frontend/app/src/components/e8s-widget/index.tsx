import { EIconKind, Icon } from "@components/icon";
import { MetricWidget } from "@components/metric-widget";
import { E8s } from "@utils/math";
import { IClass } from "@utils/types";

export enum EE8sKind {
  FMJ = "FMJ",
  ICP = "ICP",
  Storypoints = "Storypoints",
  Hours = "Hours",
}

export interface IE8sWidgetProps extends IClass {
  minValue: E8s;
  maxValue?: E8s;
  kind: EE8sKind;
}

export function E8sWidget(props: IE8sWidgetProps) {
  const iconKind = () =>
    props.kind === EE8sKind.FMJ
      ? EIconKind.FMJ
      : props.kind === EE8sKind.ICP
      ? EIconKind.ICP
      : props.kind === EE8sKind.Storypoints
      ? EIconKind.Storypoints
      : EIconKind.Hours;

  const value = () => {
    if (props.maxValue) {
      return `from ${props.minValue.toPrecision(
        4,
        true
      )} to ${props.maxValue.toPrecision(4, true)}`;
    } else {
      return props.minValue.toPrecision(4, true);
    }
  };

  return (
    <div class={`flex items-center gap-1 ${props.class ? props.class : ""}`}>
      <Icon kind={iconKind()} />
      <MetricWidget primary={value()} secondary={props.kind} />
    </div>
  );
}
