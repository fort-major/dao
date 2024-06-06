import { IClass } from "../../utils/types";

export interface IAvatarProps extends IClass {
  url: string;
}

export function Avatar(props: IAvatarProps) {
  return (
    <img
      class={`rounded-full border w-12 h-12 ${props.class ? props.class : ""}`}
      src={props.url}
    />
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
