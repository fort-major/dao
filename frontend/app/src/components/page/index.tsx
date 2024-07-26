import { IChildren, IClass, IRef } from "@utils/types";
import { Match, Switch } from "solid-js";

type T = IChildren & IClass & IRef<HTMLDivElement>;
export interface IPageProps extends T {
  slim?: boolean;
  outerClass?: string;
}

export function Page(props: IPageProps) {
  return (
    <div
      ref={props.ref}
      class="flex flex-col items-center text-black font-primary"
      classList={{ [props.outerClass!]: !!props.outerClass }}
    >
      <div
        class="flex flex-col w-full relative gap-20"
        classList={{
          ["max-w-5xl items-center"]: !!props.slim,
          [props.class!]: !!props.class,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
