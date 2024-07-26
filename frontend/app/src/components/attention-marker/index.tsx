import { IClass } from "@utils/types";

export function AttentionMarker(props: IClass) {
  return (
    <span
      class="absolute right-[-4px] top-[-4px] flex h-2 w-2"
      classList={{ [props.class!]: !!props.class }}
    >
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-darkBlue opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 bg-darkBlue"></span>
    </span>
  );
}
