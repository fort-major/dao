import {
  SolutionField,
  SolutionFieldKind,
  SolverConstraint,
} from "@/declarations/tasks/tasks.did";
import { BooleanInput } from "@components/boolean-input";
import { Btn } from "@components/btn";
import { DecisionTopic } from "@components/decision-topic";
import { EE8sKind } from "@components/e8s-widget";
import { EIconKind } from "@components/icon";
import { MdInput } from "@components/md-input";
import { QtyInput } from "@components/qty-input";
import { Select } from "@components/select";
import { TextInput } from "@components/text-input";
import { Title } from "@components/title";
import { Principal } from "@dfinity/principal";
import { useAuth } from "@store/auth";
import { DecisionTopicId, useTasks } from "@store/tasks";
import { useVotings } from "@store/votings";
import { COLORS } from "@utils/colors";
import { err, ErrorCode, logInfo } from "@utils/error";
import { E8s } from "@utils/math";
import { Result, TTaskId } from "@utils/types";
import {
  batch,
  createEffect,
  createSignal,
  For,
  on,
  onMount,
  Show,
} from "solid-js";
import { createStore } from "solid-js/store";

export interface ICreateTaskFormProps {
  id?: TTaskId;
}

type FieldsStoreEntry = {
  name: Result<string, string>;
  description: Result<string, string>;
  type: SolutionFieldType;
  required: boolean;
};

export type SolutionFieldType =
  | "Dfinity Forum Link"
  | "Fort Major Site Link"
  | "Custom Text"
  | "Twitter Link"
  | "Github Link"
  | "Notion Link"
  | "Figma Link"
  | "Custom Link";

export function getSolutionFieldType(f: SolutionField): SolutionFieldType {
  if ("Md" in f.kind) {
    return "Custom Text";
  }

  if ("Url" in f.kind) {
    const u = f.kind.Url.kind;

    if ("Any" in u) {
      return "Custom Link";
    } else if ("Github" in u) {
      return "Github Link";
    } else if ("Twitter" in u) {
      return "Twitter Link";
    } else if ("Figma" in u) {
      return "Figma Link";
    } else if ("Notion" in u) {
      return "Notion Link";
    } else if ("FortMajorSite" in u) {
      return "Fort Major Site Link";
    } else if ("DfinityForum" in u) {
      return "Dfinity Forum Link";
    }
  }

  err(ErrorCode.UNREACHEABLE, "Unknown solution field kind");
}

export function CreateTaskForm(props: ICreateTaskFormProps) {
  const { tasks, fetchTasksById, editTask, createTask, deleteTask } =
    useTasks();
  const { decisionTopics } = useVotings();
  const { isAuthorized, disable, enable } = useAuth();

  const task = () =>
    props.id !== undefined ? tasks[props.id.toString()] : undefined;

  createEffect(() => {
    if (!task() && props.id !== undefined && isAuthorized())
      fetchTasksById([props.id]);
  });

  createEffect(
    on(task, (t) => {
      if (!t) return;

      const maxSolutions = t.solver_constraints.find(
        (it) => "MaxSolutions" in it
      )?.MaxSolutions;

      const solutionFields: FieldsStoreEntry[] = [];

      for (let f of t.solution_fields) {
        solutionFields.push({
          name: Result.Ok(f.name),
          description: Result.Ok(f.description),
          required: f.required,
          type: getSolutionFieldType(f),
        });
      }

      batch(() => {
        setTitle(Result.Ok(t.title));
        setDescription(Result.Ok(t.description));
        setTeamOnly(!!t.solver_constraints.find((it) => "TeamOnly" in it));
        setDaysToSolve(Result.Ok(Number(t.days_to_solve)));
        if (maxSolutions) setMaxSolutionsNum(Result.Ok(maxSolutions));
        setHoursReward(Result.Ok(t.hours_base));
        setStorypointsBaseRewards(Result.Ok(t.storypoints_base));
        setStorypointsAdditionalRewards(Result.Ok(t.storypoints_ext_budget));
        setTopics([...t.decision_topics]);
        if (t.assignees && t.assignees.length > 0)
          setAssignee(Result.Ok(t.assignees[0].toText()));

        setFields(solutionFields);
      });
    })
  );

  const clear = () => {
    batch(() => {
      setTitle(Result.Ok(""));
      setDescription(Result.Ok(""));
      setTeamOnly(true);
      setDaysToSolve(Result.Ok(7));
      setMaxSolutionsNum(Result.Ok(100));
      setHoursReward(Result.Ok(E8s.zero()));
      setStorypointsBaseRewards(Result.Ok(E8s.zero()));
      setStorypointsAdditionalRewards(Result.Ok(E8s.zero()));
      setTopics([]);
      setAssignee(Result.Ok(""));
      setFields([]);
    });
  };

  const [title, setTitle] = createSignal<Result<string, string>>(Result.Ok(""));
  const [teamOnly, setTeamOnly] = createSignal(true);
  const [description, setDescription] = createSignal<Result<string, string>>(
    Result.Ok("")
  );
  const [daysToSolve, setDaysToSolve] = createSignal<Result<number, number>>(
    Result.Ok(7)
  );
  const [maxSolutionsNum, setMaxSolutionsNum] = createSignal<
    Result<number, number>
  >(Result.Ok(100));
  const [hoursReward, setHoursReward] = createSignal<Result<E8s, E8s>>(
    Result.Ok(E8s.zero())
  );
  const [storypointsBaseReward, setStorypointsBaseRewards] = createSignal<
    Result<E8s, E8s>
  >(Result.Ok(E8s.zero()));
  const [storypointsAdditionalReward, setStorypointsAdditionalRewards] =
    createSignal<Result<E8s, E8s>>(Result.Ok(E8s.zero()));
  const [topics, setTopics] = createSignal<number[]>([]);
  const [assignee, setAssignee] = createSignal<Result<string, string>>(
    Result.Ok("")
  );

  const [fields, setFields] = createStore<FieldsStoreEntry[]>([]);

  const isErr = () => {
    return (
      title().isErr() ||
      description().isErr() ||
      daysToSolve().isErr() ||
      maxSolutionsNum().isErr() ||
      hoursReward().isErr() ||
      storypointsBaseReward().isErr() ||
      storypointsAdditionalReward().isErr() ||
      fields.some((it) => it.description.isErr() || it.name.isErr()) ||
      assignee().isErr() ||
      topics().length === 0
    );
  };

  const canSubmit = () =>
    props.id === undefined || (task() && "Edit" in task()!.stage);

  const handleFieldTypeChange = (idx: number, res: string) => {
    setFields(idx, "type", res as SolutionFieldType);
  };

  const handleFieldNameChange = (idx: number, res: Result<string, string>) => {
    setFields(idx, "name", res);
  };

  const handleFieldDescriptionChange = (
    idx: number,
    res: Result<string, string>
  ) => {
    setFields(idx, "description", res);
  };

  const handleFieldRequiredFlags = (idx: number, res: boolean) => {
    setFields(idx, "required", res);
  };

  const handleAddFieldClick = () => {
    setFields(fields.length, {
      type: "Twitter Link",
      name: Result.Ok("Example Field Name"),
      description: Result.Ok("Example Field Description"),
      required: true,
    });
  };

  const handleDeleteFieldClick = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const field = (idx: number) => {
    return (
      <div class="flex gap-2 self-stretch">
        <Select
          value={fields[idx].type}
          onChange={(v) => handleFieldTypeChange(idx, v)}
          possibleValues={[
            "Custom Text",
            "Twitter Link",
            "Github Link",
            "Notion Link",
            "Figma Link",
            "Dfinity Forum Link",
            "Fort Major Site Link",
            "Custom Link",
          ]}
        />
        <TextInput
          value={fields[idx].name.unwrap()}
          onChange={(v) => handleFieldNameChange(idx, v)}
          validations={[{ minLen: 1 }, { maxLen: 64 }]}
          placeholder="Field Name"
        />
        <TextInput
          value={fields[idx].description.unwrap()}
          onChange={(v) => handleFieldDescriptionChange(idx, v)}
          validations={[{ minLen: 16 }, { maxLen: 512 }]}
          placeholder="Field Description"
        />
        <BooleanInput
          value={fields[idx].required}
          onChange={(v) => handleFieldRequiredFlags(idx, v)}
          labelOff="Optional"
          labelOn="Required"
        />
        <Btn
          icon={EIconKind.Minus}
          onClick={() => handleDeleteFieldClick(idx)}
          iconColor={COLORS.errorRed}
        />
      </div>
    );
  };

  const handleCreateClick = async () => {
    if (isErr()) return;

    disable();

    const constraints: SolverConstraint[] = [
      { MaxSolutions: maxSolutionsNum().unwrapOk() },
    ];
    if (teamOnly()) {
      constraints.push({ TeamOnly: null });
    }

    const result: SolutionField[] = [];

    for (let i = 0; i < fields.length; i++) {
      let kind: SolutionFieldKind = { Url: { kind: { Any: null } } };
      const ty = fields[i].type;

      if (ty === "Custom Text") {
        kind = { Md: null };
      } else if (ty === "Custom Link") {
        kind = { Url: { kind: { Any: null } } };
      } else if (ty === "Twitter Link") {
        kind = { Url: { kind: { Twitter: null } } };
      } else if (ty === "Github Link") {
        kind = { Url: { kind: { Github: null } } };
      } else if (ty === "Figma Link") {
        kind = { Url: { kind: { Figma: null } } };
      } else if (ty === "Notion Link") {
        kind = { Url: { kind: { Notion: null } } };
      } else if (ty === "Dfinity Forum Link") {
        kind = { Url: { kind: { DfinityForum: null } } };
      } else if (ty === "Fort Major Site Link") {
        kind = { Url: { kind: { FortMajorSite: null } } };
      }

      result.push({
        kind,
        name: fields[i].name.unwrapOk(),
        description: fields[i].description.unwrapOk(),
        required: fields[i].required,
      });
    }

    const assig = assignee().unwrapOk();

    if (props.id === undefined) {
      const id = await createTask({
        title: title().unwrapOk(),
        description: description().unwrapOk(),
        days_to_solve: BigInt(daysToSolve().unwrapOk()),
        solver_constraints: constraints,
        hours_base: hoursReward().unwrapOk(),
        storypoints_base: storypointsBaseReward().unwrapOk(),
        storypoints_ext_budget: storypointsAdditionalReward().unwrapOk(),
        solution_fields: result,
        assignees: assig ? [Principal.fromText(assig)] : undefined,
        decision_topics: topics(),
      });

      clear();

      fetchTasksById([id]);

      logInfo(`The task #${id.toString()} has been created`);
    } else {
      await editTask({
        id: props.id,
        new_title: title().unwrapOk(),
        new_description: description().unwrapOk(),
        new_days_to_solve: BigInt(daysToSolve().unwrapOk()),
        new_solver_constraints: constraints,
        new_hours_base: hoursReward().unwrapOk(),
        new_storypoints_base: storypointsBaseReward().unwrapOk(),
        new_storypoints_ext_budget: storypointsAdditionalReward().unwrapOk(),
        new_solution_fields: result,
        new_assignees: assig ? [Principal.fromText(assig)] : null,
        new_decision_topics: topics(),
      });

      fetchTasksById([props.id]);

      logInfo(`The task #${props.id.toString()} has been edited`);
    }

    enable();
  };

  const handleDeleteClick = async () => {
    const agreed = confirm(
      `Are you sure you want to delete task #${props.id!}? This action is irreversible.`
    );

    if (!agreed) return;

    disable();
    await deleteTask(props.id!);
    clear();
    enable();
  };

  const handleTopicSelect = (id: DecisionTopicId) => {
    setTopics((v) => {
      const idx = v.indexOf(id);

      if (idx == -1) v.push(id);
      else v.splice(idx, 1);

      return [...v];
    });
  };

  const fieldClass = "flex flex-col gap-2";

  return (
    <div class="flex flex-col gap-6">
      <div class="flex gap-6">
        <div class={fieldClass + " flex-grow"}>
          <Title text="Title" required />
          <TextInput
            validations={[{ required: null }, { minLen: 1 }, { maxLen: 256 }]}
            value={title().unwrap()}
            onChange={setTitle}
          />
        </div>
        <div class={fieldClass + " min-w-28"}>
          <Title text="Team Only" />
          <BooleanInput
            labelOff="Public"
            labelOn="Team Only"
            value={teamOnly()}
            onChange={setTeamOnly}
          />
        </div>
      </div>
      <div class={fieldClass}>
        <Title text="Topics" required />
        <div class="flex gap-3 flex-wrap">
          <For each={Object.values(decisionTopics).map((it) => it!.id)}>
            {(topicId) => (
              <DecisionTopic
                id={topicId}
                selected={topics().includes(topicId)}
                onSelect={() => handleTopicSelect(topicId)}
              />
            )}
          </For>
        </div>
      </div>
      <div class={fieldClass}>
        <Title text="Assignee" />
        <TextInput
          value={assignee() ? assignee()!.unwrap()! : ""}
          onChange={setAssignee}
          validations={[{ principal: null }]}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Description" required />
        <MdInput
          validations={[{ required: null }, { minLen: 16 }, { maxLen: 4096 }]}
          value={description().unwrap()}
          onChange={setDescription}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Days To Solve" />
        <QtyInput
          symbol="Days"
          validations={[{ min: 0 }, { max: 90 }]}
          value={daysToSolve().unwrap()}
          onChange={setDaysToSolve}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Max Solutions Number" />
        <QtyInput
          symbol="Solutions"
          validations={[{ min: 1 }, { max: 1000 }]}
          value={maxSolutionsNum().unwrap()}
          onChange={setMaxSolutionsNum}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Hours Reward" />
        <QtyInput
          symbol={EE8sKind.Hour}
          validations={[{ max: E8s.fromBigIntBase(40n) }]}
          value={hoursReward().unwrap()}
          onChange={setHoursReward}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Storypoints Base Reward" />
        <QtyInput
          symbol={EE8sKind.Storypoint}
          validations={[{ max: E8s.fromBigIntBase(100n) }]}
          value={storypointsBaseReward().unwrap()}
          onChange={setStorypointsBaseRewards}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Storypoints Max Additional Reward" />
        <QtyInput
          symbol={EE8sKind.Storypoint}
          validations={[{ max: E8s.fromBigIntBase(100n) }]}
          value={storypointsAdditionalReward().unwrap()}
          onChange={setStorypointsAdditionalRewards}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Solution Fields" />
        <div class="flex flex-col gap-2 justify-end">
          <For each={fields}>{(_, idx) => field(idx())}</For>
          <Btn icon={EIconKind.Plus} onClick={handleAddFieldClick} />
        </div>
      </div>
      <div class="flex gap-2 justify-end">
        <Btn
          text={props.id === undefined ? "Create Task" : "Edit Task"}
          disabled={isErr() || !canSubmit()}
          onClick={handleCreateClick}
          icon={EIconKind.Edit}
          iconColor={COLORS.green}
        />
        <Show when={props.id !== undefined}>
          <Btn
            text="Delete Task"
            onClick={handleDeleteClick}
            icon={EIconKind.CancelCircle}
            iconColor={COLORS.errorRed}
          />
        </Show>
      </div>
    </div>
  );
}
