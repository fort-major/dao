import { EIconKind, Icon } from "@components/icon";
import { COLORS } from "@utils/colors";
import { Show } from "solid-js";

export interface IMetricWidgetProps {
  primary: string;
  secondary?: string;
  onEdit?: (value: string) => void;
  white?: boolean;
}

export function MetricWidget(props: IMetricWidgetProps) {
  return (
    <div class="flex items-baseline gap-[2px] font-primary">
      <p
        class="text-sm text-black font-medium"
        classList={{ "text-white": !!props.white }}
      >
        {props.primary}
      </p>
      <Show when={props.secondary}>
        <span class="text-xs text-gray-150 font-normal">{props.secondary}</span>
      </Show>
      <Show when={props.onEdit}>
        <Icon kind={EIconKind.Edit} size={14} color={COLORS.gray[150]} />
      </Show>
    </div>
  );
}
