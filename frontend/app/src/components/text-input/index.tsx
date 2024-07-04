import { ValidationError } from "@components/validation-error";
import { eventHandler } from "@utils/security";
import { Show, createSignal, onMount } from "solid-js";

export type TTextInputValidation =
  | { minLen: number }
  | { maxLen: number }
  | {
      url:
        | "Github"
        | "Notion"
        | "Figma"
        | "DfinityForum"
        | "FortMajorSite"
        | "Twitter";
    };

export interface ITextInputProps {
  defaultValue?: string;
  onChange?: (val: string | undefined) => void;
  placeholder?: string;
  validations?: TTextInputValidation[];
}

export function TextInput(props: ITextInputProps) {
  const [value, setValue] = createSignal(props.defaultValue ?? "");
  const [error, setError] = createSignal<string | undefined>();

  onMount(() => {
    if (props.defaultValue && props.onChange) {
      props.onChange(props.defaultValue);
    }
  });

  const handleChange = eventHandler(
    (e: Event & { target: HTMLInputElement }) => {
      const v = e.target.value;

      setValue(v);
      const error = isValid(v, props.validations);
      setError(error);

      props.onChange?.(error ? undefined : v);
    }
  );

  return (
    <div class="flex flex-col">
      <input
        type="text"
        class="flex p-2 font-primary focus:outline-none text-sm leading-6  shadow-sm"
        classList={{ italic: value() === "", "shadow-errorRed": !!error() }}
        placeholder={props.placeholder ?? "Type here"}
        value={value()}
        onChange={handleChange}
      />
      <ValidationError error={error()} />
    </div>
  );
}

function isValid(
  s: string,
  validations?: TTextInputValidation[]
): undefined | string {
  if (!validations || validations.length == 0) return undefined;

  for (let validation of validations) {
    if ("minLen" in validation) {
      if (s.length < validation.minLen)
        return `Min length is ${validation.minLen}`;
    }

    if ("maxLen" in validation) {
      if (s.length > validation.maxLen)
        return `Max length is ${validation.maxLen}`;
    }

    if ("url" in validation) {
      try {
        const u = new URL(s);

        switch (validation.url) {
          case "Github":
            if (!u.host.endsWith("github.com")) return "Not a Github url";
            break;

          case "Notion":
            if (
              !u.host.endsWith("notion.so") &&
              !u.host.endsWith("notion.site")
            )
              return "Not a Notion url";
            break;

          case "Figma":
            if (!u.host.endsWith("figma.com")) return "Not a Figma url";
            break;

          case "DfinityForum":
            if (!u.host.endsWith("forum.dfinity.org"))
              return "Not a Dfinity forum url";
            break;

          case "FortMajorSite":
            if (!u.host.endsWith("fort-major.org"))
              return "Not Fort Major site url";
            break;

          case "Twitter":
            if (!u.host.endsWith("twitter.com") && !u.host.endsWith("x.com"))
              return "Not a Twitter (X) url";
            break;
        }
      } catch (_) {
        return "Not a url";
      }
    }
  }

  return undefined;
}
