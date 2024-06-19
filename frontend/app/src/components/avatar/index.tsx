import { Show } from "solid-js";
import { IClass } from "../../utils/types";

export interface IAvatarProps extends IClass {
  url?: string;
}

export function Avatar(props: IAvatarProps) {
  return (
    <Show when={props.url} fallback={<AvatarSkeleton class={props.class} />}>
      <img
        class={`rounded-full border w-12 h-12 ${
          props.class ? props.class : ""
        }`}
        src={props.url}
      />
    </Show>
  );
}

export function AvatarSkeleton(props: IClass) {
  return (
    <div
      class={`rounded-full border w-12 h-12 ${
        props.class ? props.class : ""
      } bg-gray-800 text-white font-sans font-extrabold animate-pulse`}
    >
      ?
    </div>
  );
}
