import { Show } from "solid-js";
import { IClass } from "../../utils/types";

export interface IAvatarProps extends IClass {
  url?: string;
  borderColor?: string;
  big?: boolean;
}

export function Avatar(props: IAvatarProps) {
  return (
    <Show when={props.url} fallback={<AvatarSkeleton class={props.class} />}>
      <img
        class={`rounded-full border-2 ${props.class ? props.class : ""} ${
          props.big ? "size-24" : "size-12"
        }`}
        style={{ "border-color": props.borderColor }}
        src={props.url}
      />
    </Show>
  );
}

export function AvatarSkeleton(props: IAvatarProps) {
  return (
    <div
      class={`rounded-full border ${props.class ? props.class : ""} ${
        props.big ? "size-24 text-4xl" : "size-12 text-2xl"
      } bg-gray-150 text-white font-sans font-extrabold animate-pulse flex items-center justify-center`}
    >
      ?
    </div>
  );
}
