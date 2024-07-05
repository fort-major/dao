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
  value: E8s;
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

  return (
    <div class={`flex items-center gap-1 ${props.class ? props.class : ""}`}>
      <Icon kind={iconKind()} />
      <MetricWidget
        primary={props.value.toPrecision(4, true)}
        secondary={props.kind}
      />
    </div>
  );
}
