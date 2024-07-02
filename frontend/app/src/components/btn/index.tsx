import { Show } from "solid-js";
import { eventHandler } from "../../utils/security";
import { EIconKind, Icon } from "../icon";

export interface IBtnProps {
  text?: string;
  icon?: EIconKind;
  disabled?: boolean;
  onClick?: () => void;
}

export function Btn(props: IBtnProps) {
  const handleClick = eventHandler(() => props.onClick?.());

  return (
    <button
      class="flex active:shadow-none shadow-sm items-center justify-center gap-2 px-5 py-2"
      disabled={props.disabled}
      onClick={handleClick}
    >
      <p class="font-primary font-medium text-md select-none">{props.text}</p>
      <Show when={props.icon}>
        <Icon kind={props.icon!} />
      </Show>
    </button>
  );
}
