import { IClass } from "../../utils/types";

export interface IAvatarProps extends IClass {
  url: string;
}

export function Avatar(props: IAvatarProps) {
  return (
    <img
      class={`rounded-full w-5 h-5 ${props.class ? props.class : ""}`}
      src={props.url}
    />
  );
}
