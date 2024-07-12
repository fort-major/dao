import { IClass } from "@utils/types";

export function ComingSoonText(props: IClass) {
  return (
    <small
      class="italic text-gray-190 text-lg"
      classList={{ [props.class!]: !!props.class }}
    >
      (coming soon)
    </small>
  );
}
