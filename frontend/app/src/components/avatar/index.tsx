import { Show } from "solid-js";
import { IClass } from "../../utils/types";

export interface IAvatarProps extends IClass {
  url?: string;
  borderColor?: string;
}

export function Avatar(props: IAvatarProps) {
  return (
    <Show when={props.url} fallback={<AvatarSkeleton class={props.class} />}>
      <img
        class={`rounded-full border w-12 h-12 ${
          props.class ? props.class : ""
        }`}
        style={{ "border-color": props.borderColor }}
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
      } bg-gray-150 text-white font-sans font-extrabold animate-pulse flex items-center justify-center`}
    >
      ?
    </div>
  );
}
