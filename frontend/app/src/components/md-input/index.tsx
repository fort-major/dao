import { MdPreview } from "@components/md-preview";
import { MdTools } from "@components/md-tools";
import { ErrorCode, err } from "@utils/error";
import { eventHandler } from "@utils/security";
import { Match, Switch, createSignal } from "solid-js";
import TextArea from "solid-textarea-autosize";

export interface IMdInputProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export function MdInput(props: IMdInputProps) {
  const [history, setHistory] = createSignal<string[]>([]);
  const [value, setValue] = createSignal(props.defaultValue ?? "");
  const [mode, setMode] = createSignal<"edit" | "preview">("edit");

  let textAreaRef: HTMLTextAreaElement | undefined;

  const pushHistory = (v: string) => {
    setHistory((h) => {
      if (h.length == 256) {
        h.shift();
      }

      h.push(v);

      return h;
    });
  };

  const popHistory = (): string | undefined => {
    const h = history();

    if (h.length === 0) return undefined;

    const entry = h[h.length - 1];

    setHistory((h) => {
      h.pop();
      return h;
    });

    return entry;
  };

  const handleChangeEvent = eventHandler(
    (e: Event & { target: HTMLTextAreaElement }) => handleChange(e.target.value)
  );

  const handleChange = (newValue: string | ((v: string) => string)) => {
    if (typeof newValue === "string") {
      setValue((v) => {
        if (newValue === v) return v;

        pushHistory(v);

        return newValue;
      });

      props.onChange?.(newValue);
    } else {
      let nv: string;

      setValue((v) => {
        nv = newValue(v);

        if (nv === v) return v;

        pushHistory(v);

        return nv;
      });

      props.onChange?.(nv!);
    }
  };

  const handleOnPreview = (isPreview: boolean) => {
    setMode(isPreview ? "preview" : "edit");
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
      replaceSelection((_) => [clipboardText, undefined, undefined]);
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
    if (!textAreaRef)
      err(ErrorCode.UNREACHEABLE, "Text Area Ref accessed before linking");

    const from = textAreaRef.selectionStart;
    const to = textAreaRef.selectionEnd;

    const selected = value().substring(from, to);
    const [replacement, newFrom, newTo] = fn(selected, from, to);

    handleChange(
      (v) => `${v.substring(0, from)}${replacement}${v.substring(to)}`
    );

    textAreaRef.focus();

    if (newFrom) {
      textAreaRef.selectionStart = newFrom;
    } else if (newFrom === null) {
      textAreaRef.selectionStart = from;
    }

    if (newTo) {
      textAreaRef.selectionEnd = newTo;
    } else if (newFrom === null) {
      textAreaRef.selectionEnd = to + replacement.length - selected.length;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code == "Tab") {
      e.preventDefault();

      replaceSelection((selected) => {
        if (selected.length === 0) {
          return ["  ", undefined, undefined];
        }

        return [selected, null, null];
      });
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
          const v = popHistory();
          if (v !== undefined) {
            setValue(v);
            props.onChange?.(v);
          }
          break;
      }
    }
  };

  return (
    <div class="flex flex-col shadow-md">
      <MdTools
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
            class="font-primary font-light p-3 focus:outline-none"
            classList={{ italic: value().length === 0 }}
            minRows={10}
            ref={textAreaRef}
            placeholder={props.placeholder ?? "Start typing..."}
            onInput={handleChangeEvent}
            onChange={handleChangeEvent}
            value={value()}
            onKeyDown={handleKeyDown}
          />
        </Match>
        <Match when={mode() === "preview"}>
          <MdPreview class="font-primary font-light p-3" content={value()} />
        </Match>
      </Switch>
    </div>
  );
}
