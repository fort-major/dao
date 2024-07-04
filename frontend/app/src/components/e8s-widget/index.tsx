import { EIconKind, Icon } from "@components/icon";
import { MetricWidget } from "@components/metric-widget";
import { E8s } from "@utils/math";

export interface IE8sWidgetProps {
  value: E8s;
  kind: "FMJ" | "ICP" | "Storypoints" | "Hours";
}

export function E8sWidget(props: IE8sWidgetProps) {
  const iconKind = () =>
    props.kind === "FMJ"
      ? EIconKind.FMJ
      : props.kind === "ICP"
      ? EIconKind.ICP
      : props.kind === "Storypoints"
      ? EIconKind.Storypoints
      : EIconKind.Hours;

  return (
    <div class="flex items-center gap-1">
      <Icon kind={iconKind()} />
      <MetricWidget
        primary={props.value.toPrecision(4, true)}
        secondary={props.kind}
      />
    </div>
  );
}
