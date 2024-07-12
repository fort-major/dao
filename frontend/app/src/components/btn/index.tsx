import { Show } from "solid-js";
import { eventHandler } from "../../utils/security";
import { EIconKind, Icon } from "../icon";
import { useAuth } from "@store/auth";

export interface IBtnProps {
  text?: string;
  icon?: EIconKind;
  iconColor?: string;
  disabled?: boolean;
  onClick?: () => void;
  class?: string;
}

export function Btn(props: IBtnProps) {
  const { disabled } = useAuth();

  const handleClick = eventHandler(() => props.onClick?.());

  const d = () => props.disabled || disabled();

  return (
    <button
      class="flex active:shadow-none shadow-md items-center justify-center gap-2 px-5 py-2"
      classList={{
        "shadow-none": d(),
        "bg-gray-190": d(),
        [props.class!]: !!props.class,
      }}
      disabled={d()}
      onClick={handleClick}
    >
      <Show when={props.text}>
        <p class="font-primary font-medium text-md select-none">{props.text}</p>
      </Show>
      <Show when={props.icon}>
        <Icon kind={props.icon!} color={props.iconColor} />
      </Show>
    </button>
  );
}
