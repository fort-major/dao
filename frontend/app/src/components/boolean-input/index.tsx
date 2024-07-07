import { Show } from "solid-js";
import { eventHandler } from "@utils/security";
import { EIconKind, Icon } from "@components/icon";
import { COLORS } from "@utils/colors";

export interface IBooleanInputProps {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  labelOn?: string;
  labelOff?: string;
}

export function BooleanInput(props: IBooleanInputProps) {
  const labelOn = () => props.labelOn ?? "On";
  const labelOff = () => props.labelOff ?? "Off";

  const handleClick = eventHandler(() => {
    if (props.disabled) return;

    props.onChange?.(!props.value);
  });

  const iconColor = () => {
    if (props.disabled) return COLORS.gray[190];

    return props.value ? COLORS.black : COLORS.gray[150];
  };

  return (
    <div
      onClick={handleClick}
      class="flex gap-2 items-center justify-end px-2 py-3"
      classList={{ "cursor-pointer": !props.disabled }}
    >
      <p class="select-none font-medium text-xs text-gray-150">
        <Show when={props.value} fallback={labelOff()}>
          {labelOn()}
        </Show>
      </p>
      <Icon
        color={iconColor()}
        kind={props.value ? EIconKind.ToggleOn : EIconKind.ToggleOff}
      />
    </div>
  );
}
