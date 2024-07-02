import { Show, createSignal } from "solid-js";
import { eventHandler } from "@utils/security";
import { EIconKind, Icon } from "@components/icon";
import { COLORS } from "@utils/colors";

export interface IBooleanInputProps {
  defaultValue?: boolean;
  disabled?: boolean;
  labels?: [string, string];
  onChange?: (v: boolean) => void;
}

export function BooleanInput(props: IBooleanInputProps) {
  const [value, setValue] = createSignal(props.defaultValue ?? false);
  const labelOn = () => (props.labels ? props.labels[0] : "On");
  const labelOff = () => (props.labels ? props.labels[1] : "Off");

  const handleClick = eventHandler(() => {
    if (props.disabled) return;

    setValue((v) => !v);
    props.onChange?.(value());
  });

  return (
    <div
      onClick={handleClick}
      class="flex gap-2 items-center justify-end px-2 py-3"
      classList={{ "cursor-pointer": !props.disabled }}
    >
      <p class="select-none font-medium text-xs text-gray-150">
        <Show when={value()} fallback={labelOff()}>
          {labelOn()}
        </Show>
      </p>
      <Icon
        color={value() ? COLORS.black : COLORS.gray[150]}
        kind={value() ? EIconKind.ToggleOn : EIconKind.ToggleOff}
      />
    </div>
  );
}
