import { MdPreview } from "@components/md-preview";
import { MdTools } from "@components/md-tools";
import { ValidationError } from "@components/validation-error";
import { useAuth } from "@store/auth";
import { ErrorCode, err } from "@utils/error";
import { eventHandler } from "@utils/security";
import { Result } from "@utils/types";
import { Match, Switch, createEffect, createSignal, onMount } from "solid-js";
import { produce } from "solid-js/store";
import TextArea from "solid-textarea-autosize";

export type TMdInputValidation =
  | { required: null }
  | { minLen: number }
  | { maxLen: number };

export interface IMdInputProps {
  value: string;
  onChange: (value: Result<string, string>) => void;
  placeholder?: string;
  disabled?: boolean;
  validations?: TMdInputValidation[];
  noMountTrigger?: boolean;
}

export function MdInput(props: IMdInputProps) {
  const { disabled } = useAuth();

  const [history, setHistory] = createSignal<Result<string, string>[]>([]);
  const [mode, setMode] = createSignal<"edit" | "preview">("edit");
  const [error, setError] = createSignal<string | undefined>();

  const d = () => disabled() || props.disabled;

  let textAreaRef: HTMLTextAreaElement | undefined;

  onMount(() => {
    if (!props.noMountTrigger) {
      const error = isValid(props.value, props.validations);
      props.onChange(error ? Result.Err(props.value) : Result.Ok(props.value));
    }
  });

  const pushHistory = (v: Result<string, string>) => {
    setHistory(
      produce((h) => {
        if (h.length > 0) {
          const last = h[h.length - 1];
          if (v.eq(last)) {
            return;
          }
        }

        if (h.length == 256) {
          h.shift();
        }

        h.push(v);
      })
    );
  };

  const popHistory = (): Result<string, string> | undefined => {
    const h = history();

    if (h.length === 0) return undefined;

    const entry = h[h.length - 1];

    setHistory(
      produce((h) => {
        h.pop();
      })
    );

    return entry;
  };

  const handleChangeEvent = eventHandler(
    (e: Event & { target: HTMLTextAreaElement }) => handleChange(e.target.value)
  );

  const handleChange = (newValue: string) => {
    const error = isValid(newValue, props.validations);
    setError(error);

    const v = error
      ? Result.Err<string, string>(newValue)
      : Result.Ok<string, string>(newValue);

    pushHistory(v);
    props.onChange(v);
  };

  const handleOnPreview = (isEdit: boolean) => {
    setMode(isEdit ? "edit" : "preview");
  };

  const handleOnBold = () =>
    replaceSelection((selected, from, to) => {
      if (selected.startsWith("**") && selected.endsWith("**")) {
        return [`${selected.substring(2, selected.length - 2)}`, null, null];
      } else {
        return [`**${selected}**`, null, null];
      }
    });

  const handleOnItalic = () =>
    replaceSelection((selected, from, to) => {
      if (selected.startsWith("_") && selected.endsWith("_")) {
        return [`${selected.substring(1, selected.length - 1)}`, null, null];
      } else {
        return [`_${selected}_`, null, null];
      }
    });

  const handleOnUnderline = () => {
    replaceSelection((selected) => {
      if (selected.startsWith("*_") && selected.endsWith("_*")) {
        return [`${selected.substring(2, selected.length - 2)}`, null, null];
      } else {
        return [`*_${selected}_*`, null, null];
      }
    });
  };

  const handleOnLink = () =>
    replaceSelection((selected, from) => [
      `[${selected}](<paste url here>)`,
      from + selected.length + 3,
      from + selected.length + 19,
    ]);

  const handleOnImage = () =>
    replaceSelection((selected, from) => [
      `![${selected}](<paste image url here>)`,
      from + selected.length + 4,
      from + selected.length + 26,
    ]);

  const handleLinkPaste = async () => {
    const clipboardText = await navigator.clipboard.readText();

    try {
      const url = new URL(clipboardText);

      replaceSelection((selected, from) => {
        let selectedIsUrl = true;

        try {
          new URL(selected);
        } catch (_) {
          selectedIsUrl = false;
        }

        if (
          selected.length == 0 ||
          selectedIsUrl ||
          (selected.startsWith("<") && selected.endsWith(">"))
        ) {
          return [url.toString(), undefined, null];
        } else {
          return [
            `[${selected}](${url.toString()})`,
            from + 1,
            from + 1 + selected.length,
          ];
        }
      });
    } catch (_) {
      replaceSelection((_, from, to) => [
        clipboardText,
        clipboardText.length + to,
        clipboardText.length + to,
      ]);
    }
  };

  const handleOnH1 = () =>
    replaceSelection((selected) => {
      if (selected.startsWith("# ")) {
        return [`${selected.substring(2)}`, undefined, undefined];
      } else {
        return [`# ${selected}`, undefined, undefined];
      }
    });

  const handleOnH2 = () =>
    replaceSelection((selected) => {
      if (selected.startsWith("## ")) {
        return [`${selected.substring(3)}`, undefined, undefined];
      } else {
        return [`## ${selected}`, undefined, undefined];
      }
    });

  const handleOnH3 = () =>
    replaceSelection((selected) => {
      if (selected.startsWith("### ")) {
        return [`${selected.substring(4)}`, undefined, undefined];
      } else {
        return [`### ${selected}`, undefined, undefined];
      }
    });

  const handleOnH4 = () =>
    replaceSelection((selected) => {
      if (selected.startsWith("#### ")) {
        return [`${selected.substring(5)}`, undefined, undefined];
      } else {
        return [`#### ${selected}`, undefined, undefined];
      }
    });

  const handleOnH5 = () =>
    replaceSelection((selected) => {
      if (selected.startsWith("##### ")) {
        return [`${selected.substring(6)}`, undefined, undefined];
      } else {
        return [`##### ${selected}`, undefined, undefined];
      }
    });

  const handleOnH6 = () =>
    replaceSelection((selected) => {
      if (selected.startsWith("###### ")) {
        return [`${selected.substring(7)}`, undefined, undefined];
      } else {
        return [`###### ${selected}`, undefined, undefined];
      }
    });

  const replaceSelection = (
    fn: (
      selected: string,
      from: number,
      to: number
    ) => [string, number | undefined | null, number | undefined | null]
  ) => {
    if (d()) return;

    if (!textAreaRef)
      err(ErrorCode.UNREACHEABLE, "Text Area Ref accessed before linking");

    const from = textAreaRef.selectionStart;
    const to = textAreaRef.selectionEnd;

    const selected = props.value.substring(from, to);
    const [replacement, newFrom, newTo] = fn(selected, from, to);

    handleChange(
      `${props.value.substring(0, from)}${replacement}${props.value.substring(
        to
      )}`
    );

    textAreaRef.focus();

    if (typeof newFrom === "number") {
      textAreaRef.selectionStart = newFrom;
    } else {
      textAreaRef.selectionStart = from;
    }

    if (typeof newTo === "number") {
      textAreaRef.selectionEnd = newTo;
    } else {
      textAreaRef.selectionEnd = to + replacement.length - selected.length;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code == "Tab") {
      e.preventDefault();

      replaceSelection(() => {
        return ["  ", undefined, undefined];
      });

      return;
    }

    if (e.ctrlKey) {
      switch (e.key) {
        case "b":
          e.preventDefault();
          handleOnBold();
          break;

        case "i":
          e.preventDefault();
          handleOnItalic();
          break;

        case "v":
          e.preventDefault();
          handleLinkPaste();
          break;

        case "u":
          e.preventDefault();
          handleOnUnderline();
          break;

        case "z":
          e.preventDefault();
          if (d()) return;
          const v = popHistory();
          if (v !== undefined) {
            props.onChange(v);
          } else {
            handleChange("");
          }
          break;
      }
    }
  };

  return (
    <div class="flex flex-col gap-1">
      <div
        class="flex flex-col shadow-md"
        classList={{ "shadow-errorRed": !!error() }}
      >
        <MdTools
          isEdit={mode() === "edit"}
          onPreview={handleOnPreview}
          onBold={handleOnBold}
          onItalic={handleOnItalic}
          onUnderline={handleOnUnderline}
          onLink={handleOnLink}
          onImage={handleOnImage}
          onH1={handleOnH1}
          onH2={handleOnH2}
          onH3={handleOnH3}
          onH4={handleOnH4}
          onH5={handleOnH5}
          onH6={handleOnH6}
        />
        <Switch>
          <Match when={mode() === "edit"}>
            <TextArea
              class="font-primary font-light focus:outline-none p-4"
              classList={{
                italic: props.value.length === 0,
                "bg-gray-190": d(),
              }}
              minRows={10}
              ref={textAreaRef}
              placeholder={props.placeholder ?? "Start typing..."}
              onInput={handleChangeEvent}
              onChange={handleChangeEvent}
              value={props.value}
              onKeyDown={handleKeyDown}
              disabled={d()}
            />
          </Match>
          <Match when={mode() === "preview"}>
            <MdPreview
              class="font-primary font-light p-4"
              content={props.value}
            />
          </Match>
        </Switch>
      </div>
      <ValidationError error={error()} />
    </div>
  );
}

function isValid(
  v: string,
  validations?: TMdInputValidation[]
): string | undefined {
  if (!validations || validations.length === 0) return undefined;

  let required = false;
  let result: string | undefined = undefined;

  for (let validation of validations) {
    if ("required" in validation) {
      required = true;
    }

    if ("minLen" in validation) {
      if (v.length < validation.minLen)
        result = `Min len is ${validation.minLen}`;
    }

    if ("maxLen" in validation) {
      if (v.length > validation.maxLen)
        result = `Max len is ${validation.maxLen}`;
    }
  }

  if (required && v.length === 0) {
    return "The field is required";
  } else if (v.length === 0) {
    return undefined;
  } else {
    return result;
  }
}
