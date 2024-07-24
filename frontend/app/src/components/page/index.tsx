import { IChildren, IClass, IRef } from "@utils/types";
import { Match, Switch } from "solid-js";

type T = IChildren & IClass & IRef<HTMLDivElement>;
export interface IPageProps extends T {
  slim?: boolean;
}

export function Page(props: IPageProps) {
  return (
    <div
      ref={props.ref}
      class="flex flex-col items-center px-2 lg:px-40 text-black font-primary"
    >
      <div
        class="flex flex-col w-full relative gap-20"
        classList={{
          ["max-w-5xl"]: !!props.slim,
          [props.class!]: !!props.class,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
