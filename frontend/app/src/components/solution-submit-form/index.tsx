import { SolutionField } from "@/declarations/tasks/tasks.did";
import { BooleanInput } from "@components/boolean-input";
import { Btn } from "@components/btn";
import { MdInput, TMdInputValidation } from "@components/md-input";
import { TextInput, TTextInputValidation } from "@components/text-input";
import { Title } from "@components/title";
import { useAuth } from "@store/auth";
import { useTasks } from "@store/tasks";
import { err, ErrorCode } from "@utils/error";
import { Result, TTaskId } from "@utils/types";
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js";

export interface ISolutionSubmitFormProps {
  taskId: TTaskId;
  fields: SolutionField[];
  onSubmit?: () => void;
}

export function SolutionSubmitForm(props: ISolutionSubmitFormProps) {
  const { solveTask, tasks } = useTasks();
  const { identity, disable, enable, disabled } = useAuth();

  const prevFields = createMemo(() => {
    const me = identity()?.getPrincipal();
    if (!me) return undefined;

    const prevSolution = tasks[props.taskId.toString()]?.solutions.find(
      ([solver, _]) => solver.compareTo(me) === "eq"
    );

    if (!prevSolution) return;

    return prevSolution[1].fields;
  });
  const prevWantRep = createMemo(() => {
    const me = identity()?.getPrincipal();
    if (!me) return undefined;

    const prevSolution = tasks[props.taskId.toString()]?.solutions.find(
      ([solver, _]) => solver.compareTo(me) === "eq"
    );

    if (!prevSolution) return;

    return prevSolution[1].want_rep;
  });

  const [values, setValues] = createSignal<Result<string, string>[]>(
    prevFields()
      ? prevFields()!.map(Result.Ok)
      : props.fields.map((_) => Result.Ok(""))
  );
  const [wantRep, setWantRep] = createSignal(prevWantRep() ?? false);

  const isErr = () => values().some((it) => it.isErr());

  const field = (f: SolutionField, idx: number) => {
    const validations = createMemo(() => {
      const v: TMdInputValidation[] | TTextInputValidation[] = [
        { maxLen: 512 },
      ];

      if (f.required) {
        v.push({ required: null });
      }

      if ("Url" in f.kind) {
        const k = f.kind.Url.kind;

        if ("Any" in k) (v as TTextInputValidation[]).push({ url: "Any" });
        if ("Github" in k)
          (v as TTextInputValidation[]).push({ url: "Github" });
        if ("Twitter" in k)
          (v as TTextInputValidation[]).push({ url: "Twitter" });
        if ("Notion" in k)
          (v as TTextInputValidation[]).push({ url: "Notion" });
        if ("Figma" in k) (v as TTextInputValidation[]).push({ url: "Figma" });
        if ("DfinityForum" in k)
          (v as TTextInputValidation[]).push({ url: "DfinityForum" });
        if ("FortMajorSite" in k)
          (v as TTextInputValidation[]).push({ url: "FortMajorSite" });
      }

      return v;
    });

    const handleChange = (result: Result<string, string>) => {
      setValues((v) => {
        v[idx] = result;

        return [...v];
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
            <MdInput
              value={values()[idx].unwrap()}
              onChange={handleChange}
              validations={validations() as TMdInputValidation[]}
            />
          </Match>
          <Match when={"Url" in f.kind}>
            <TextInput
              value={values()[idx].unwrap()}
              onChange={handleChange}
              validations={validations()}
            />
          </Match>
        </Switch>
      </div>
    );
  };

  const handleSubmit = async () => {
    disable();
    await solveTask(
      props.taskId,
      values().map((it) => it.unwrapOk()),
      wantRep()
    );
    enable();

    props.onSubmit?.();
  };

  const handleDelete = async () => {
    disable();
    await solveTask(props.taskId, undefined, undefined);
    enable();

    props.onSubmit?.();
  };

  return (
    <div class="max-w-3xl flex flex-col gap-5">
      <For each={props.fields}>{(f, idx) => field(f, idx())}</For>
      <BooleanInput
        value={wantRep()}
        onChange={setWantRep}
        labelOff="I don't need reputation"
        labelOn="I need reputation"
      />
      <div class="flex items-center justify-end gap-2">
        <Show when={prevFields()}>
          <Btn text="Delete" disabled={disabled()} onClick={handleDelete} />
        </Show>

        <Btn
          text={prevFields() ? "Update" : "Submit"}
          disabled={isErr()}
          onClick={handleSubmit}
        />
      </div>
    </div>
  );
}
