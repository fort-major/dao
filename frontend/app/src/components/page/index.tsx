import { IChildren, IClass } from "@utils/types";

export function Page(props: IChildren & IClass) {
  return (
    <div
      class="flex flex-col gap-20 px-40 text-black"
      classList={{ [props.class!]: !!props.class }}
    >
      {props.children}
    </div>
  );
}
