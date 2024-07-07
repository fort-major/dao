import { SolutionField } from "@/declarations/tasks/tasks.did";
import { Btn } from "@components/btn";
import { MdInput } from "@components/md-input";
import { TextInput, TTextInputValidation } from "@components/text-input";
import { Title } from "@components/title";
import { useTasks } from "@store/tasks";
import { err, ErrorCode } from "@utils/error";
import { TTaskId } from "@utils/types";
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js";

export interface ISolutionSubmitFormProps {
  taskId: TTaskId;
  fields: SolutionField[];
  onSubmit?: () => void;
}

export function SolutionSubmitForm(props: ISolutionSubmitFormProps) {
  const { solveTask } = useTasks();

  const [values, setValues] = createSignal<(string | undefined)[]>(
    props.fields.map((_) => undefined)
  );
  const [isErr, setIsErr] = createSignal(false);
  const [disabled, setDisabled] = createSignal(false);

  const field = (f: SolutionField, idx: number) => {
    const validations = createMemo(() => {
      const v: TTextInputValidation[] = [{ maxLen: 512 }];

      if ("Url" in f.kind) {
        const k = f.kind.Url.kind;

        if ("Any" in k) v.push({ url: "Any" });
        if ("Github" in k) v.push({ url: "Github" });
        if ("Twitter" in k) v.push({ url: "Twitter" });
        if ("Notion" in k) v.push({ url: "Notion" });
        if ("Figma" in k) v.push({ url: "Figma" });
        if ("DfinityForum" in k) v.push({ url: "DfinityForum" });
        if ("FortMajorSite" in k) v.push({ url: "FortMajorSite" });
      }

      return v;
    });

    const handleChange = (value: string | undefined) => {
      setValues((v) => {
        v[idx] = value;

        if (value === undefined) {
          setIsErr(true);
        }

        return v;
      });
    };

    return (
      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-2">
          <div class="flex gap-1 items-start px-2">
            <Title text={f.name} />
            <Show when={f.required}>
              <Title class="text-errorRed" text="*" />
            </Show>
          </div>
          <p class="font-primary text-xs font-thin text-gray-150 px-2">
            {f.description}
          </p>
        </div>
        <Switch>
          <Match when={"Md" in f.kind}>
            <MdInput onChange={handleChange} disabled={disabled()} />
          </Match>
          <Match when={"Url" in f.kind}>
            <TextInput
              validations={validations()}
              onChange={handleChange}
              disabled={disabled()}
            />
          </Match>
        </Switch>
      </div>
    );
  };

  const handleSubmit = async () => {
    for (let i = 0; i < props.fields.length; i++) {
      if (props.fields[i].required && !values()[i]) {
        err(ErrorCode.VALIDATION, `Field ${props.fields[i].name} is required`);
      }
    }

    setDisabled(true);
    await solveTask(props.taskId, values());
    setDisabled(false);

    props.onSubmit?.();
  };

  return (
    <div class="max-w-3xl flex flex-col gap-5">
      <For each={props.fields}>{(f, idx) => field(f, idx())}</For>
      <Btn
        text="Submit"
        disabled={disabled() && !isErr()}
        onClick={handleSubmit}
      />
    </div>
  );
}
