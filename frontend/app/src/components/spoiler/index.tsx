import { EIconKind, Icon } from "@components/icon";
import { MdPreview } from "@components/md-preview";
import { Title } from "@components/title";
import { eventHandler } from "@utils/security";
import { createSignal, JSX, Show } from "solid-js";

export interface ISpoilerProps {
  header: string;
  text: string;
  defaultExpanded?: boolean;
  class?: string;
}

export function Spoiler(props: ISpoilerProps) {
  const [expanded, setExpanded] = createSignal(props.defaultExpanded);

  const handleHeaderClick = eventHandler(() => {
    setExpanded((v) => !v);
  });

  return (
    <div class="flex flex-col self-stretch gap-5">
      <div
        onClick={handleHeaderClick}
        class="flex justify-between self-stretch items-baseline cursor-pointer gap-5"
      >
        <h4 class="flex-grow font-primary font-semibold text-black text-2xl">
          {props.header}
        </h4>
        <Icon
          class="min-w-6"
          kind={expanded() ? EIconKind.ChevronUp : EIconKind.ChevronDown}
        />
      </div>
      <Show when={expanded()}>
        <MdPreview content={props.text} />
      </Show>
    </div>
  );
}
