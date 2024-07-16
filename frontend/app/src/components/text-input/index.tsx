import { TMdInputValidation } from "@components/md-input";
import { ValidationError } from "@components/validation-error";
import { Principal } from "@dfinity/principal";
import { useAuth } from "@store/auth";
import { eventHandler } from "@utils/security";
import { Result } from "@utils/types";
import { Show, createSignal, onMount } from "solid-js";

export type TTextInputValidation =
  | TMdInputValidation
  | {
      url:
        | "Any"
        | "Github"
        | "Notion"
        | "Figma"
        | "DfinityForum"
        | "FortMajorSite"
        | "Twitter";
    }
  | { principal: null };

export interface ITextInputProps {
  value: string;
  onChange: (v: Result<string, string>) => void;
  placeholder?: string;
  validations?: TTextInputValidation[];
  disabled?: boolean;
}

export function TextInput(props: ITextInputProps) {
  const { disabled } = useAuth();

  const [error, setError] = createSignal<string | undefined>();

  const d = () => props.disabled || disabled();

  onMount(() => {
    const error = isValid(props.value, props.validations);
    props.onChange(error ? Result.Err(props.value) : Result.Ok(props.value));
  });

  const handleChange = eventHandler(
    (e: Event & { target: HTMLInputElement }) => {
      const v = e.target.value;

      const error = isValid(v, props.validations);
      setError(error);

      props.onChange(error ? Result.Err(v) : Result.Ok(v));
    }
  );

  return (
    <div class="flex flex-col gap-1 flex-1">
      <input
        type="text"
        class="flex p-2 font-primary focus:outline-none text-sm leading-6 flex-1 shadow-md"
        classList={{
          italic: props.value === "",
          "shadow-errorRed": !!error(),
          "bg-gray-190": d(),
        }}
        placeholder={props.placeholder ?? "Type here"}
        value={props.value}
        onChange={handleChange}
        disabled={d()}
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
    if ("required" in validation && s.length === 0) {
      return `This field is required`;
    }

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

    if ("principal" in validation) {
      try {
        Principal.fromText(s);
      } catch (_) {
        return "Not a Principal ID";
      }
    }
  }

  return undefined;
}
