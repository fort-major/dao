import { ROOT } from "@/routes";
import { EIconKind, Icon } from "@components/icon";
import { A } from "@solidjs/router";
import { COLORS } from "@utils/colors";
import { IClass } from "@utils/types";

export function Backlink(props: IClass) {
  return (
    <A
      class="flex items-center flex-grow justify-start self-stretch gap-1"
      classList={{ [props.class!]: !!props.class }}
      href={ROOT.$.tasks.path}
    >
      <Icon
        kind={EIconKind.ArrowRight}
        class="rotate-180"
        color={COLORS.gray[150]}
        size={18}
      />
      <p class="font-primary font-light text-sm underline text-gray-150">
        Back
      </p>
    </A>
  );
}
