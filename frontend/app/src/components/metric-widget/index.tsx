import { Show } from "solid-js";

export interface IMetricWidgetProps {
  primary: string;
  secondary?: string;
}

export function MetricWidget(props: IMetricWidgetProps) {
  return (
    <div class="flex items-baseline gap-[2px] font-primary">
      <p class="text-sm text-black font-medium">{props.primary}</p>
      <Show when={props.secondary}>
        <span class="text-xs text-gray-150 font-normal">{props.secondary}</span>
      </Show>
    </div>
  );
}
