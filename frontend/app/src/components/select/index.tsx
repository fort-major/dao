import { EIconKind, Icon } from "@components/icon";
import { COLORS } from "@utils/colors";
import { eventHandler } from "@utils/security";
import { createSignal, For, Show } from "solid-js";

export interface ISelectProps {
  values: string[];
  defaultValue?: string;
  onChange?: (v: string) => void;
}

export function Select(props: ISelectProps) {
  const [expanded, setExpanded] = createSignal(false);
  const [value, setValue] = createSignal(props.defaultValue ?? props.values[0]);

  const handleValueClick = eventHandler(() => {
    setExpanded((e) => !e);
  });

  const handleOptionClick = eventHandler(
    (e: Event & { currentTarget: HTMLDivElement }) => {
      const v = e.currentTarget.innerText;
      setValue(v);
      props.onChange?.(v);

      setExpanded(false);
    }
  );

  return (
    <div class="flex flex-col min-w-36 p-2 text-black shadow-sm">
      <div
        class="flex items-center justify-between cursor-pointer"
        onClick={handleValueClick}
      >
        <p class="select-none">{value()}</p>
        <Icon
          kind={expanded() ? EIconKind.ChevronUp : EIconKind.ChevronDown}
          color={COLORS.black}
        />
      </div>
      <Show when={expanded()}>
        <For each={props.values}>
          {(p) => (
            <div
              class="select-none hover:bg-gray-190 cursor-pointer"
              onClick={handleOptionClick}
            >
              {p}
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}
