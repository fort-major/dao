import { EIconKind, Icon } from "@components/icon";
import { ProfileMini } from "@components/profile/profile";
import { TextInput, TTextInputValidation } from "@components/text-input";
import { Principal } from "@dfinity/principal";
import { useAuth } from "@store/auth";
import { eventHandler } from "@utils/security";
import { Result } from "@utils/types";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";

export interface IPrincipalDropdownProps {
  listed: Principal[];
  value: string;
  onChange: (result: Result<string, string>) => void;
  required?: boolean;
  disabled?: boolean;
}

export function PrincipalDropdown(props: IPrincipalDropdownProps) {
  const { disabled } = useAuth();

  const [expanded, setExpanded] = createSignal(false);

  const d = () => props.disabled || disabled();

  const handleToggle = () => {
    setExpanded((v) => !v);
  };

  const handleSelect = (idx: number) => {
    if (d()) return;

    setExpanded(false);
    props.onChange(Result.Ok(props.listed[idx].toText()));
  };

  return (
    <div
      class="flex flex-col flex-grow shadow-md"
      classList={{ "bg-gray-190": d(), "bg-white": !d() }}
    >
      <div class="flex gap-2 flex-grow items-center">
        <TextInput
          value={props.value}
          onChange={props.onChange}
          validations={[
            { principal: null },
            props.required ? { required: null } : { principal: null },
          ]}
          noShadow
          placeholder="Type Or Select"
          disabled={d()}
          noMountCb
        />
        <Icon
          kind={expanded() ? EIconKind.ChevronUp : EIconKind.ChevronDown}
          onClick={handleToggle}
        />
      </div>
      <Show when={expanded()}>
        <div class="flex flex-col gap-1">
          <For each={props.listed}>
            {(id, idx) => (
              <div
                onClick={eventHandler(() => handleSelect(idx()))}
                class="cursor-pointer hover:bg-gray-190"
              >
                <ProfileMini id={id} />
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
