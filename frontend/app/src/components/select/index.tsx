import { EIconKind, Icon } from "@components/icon";
import { COLORS } from "@utils/colors";
import { eventHandler } from "@utils/security";
import { Result } from "@utils/types";
import { createSignal, For, Show } from "solid-js";

export interface ISelectProps {
  possibleValues: string[];
  value: string;
  onChange: (v: Result<string, string>) => void;
  disabled?: boolean;
}

export function Select(props: ISelectProps) {
  const [expanded, setExpanded] = createSignal(false);

  const handleValueClick = eventHandler(() => {
    setExpanded((e) => !e);
  });

  const handleOptionClick = eventHandler(
    (e: Event & { currentTarget: HTMLDivElement }) => {
      const v = e.currentTarget.innerText;
      props.onChange(Result.Ok(v));

      setExpanded(false);
    }
  );

  return (
    <div class="flex flex-col min-w-36 p-2 text-black shadow-sm relative">
      <div
        class="flex items-center justify-between cursor-pointer"
        classList={{ "bg-gray-190": props.disabled }}
        onClick={handleValueClick}
      >
        <p class="select-none">{props.value}</p>
        <Icon
          kind={
            expanded() && !props.disabled
              ? EIconKind.ChevronUp
              : EIconKind.ChevronDown
          }
          color={COLORS.black}
        />
      </div>
      <Show when={expanded() && !props.disabled}>
        <div class="flex flex-col gap-1 absolute z-10 bg-white w-full top-full left-0 shadow-sm">
          <For each={props.possibleValues}>
            {(p) => (
              <div
                class="select-none hover:bg-gray-190 cursor-pointer p-2"
                onClick={handleOptionClick}
              >
                {p}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
