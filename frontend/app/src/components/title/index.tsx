import { Show } from "solid-js";

export interface ITitleProps {
  text: string;
  required?: boolean;
  class?: string;
}

export function Title(props: ITitleProps) {
  return (
    <p
      class={`font-primary text-xs font-bold text-black ${
        props.class ? props.class : ""
      }`}
    >
      {props.text}{" "}
      <Show when={props.required}>
        <span class="text-errorRed">*</span>
      </Show>
    </p>
  );
}
