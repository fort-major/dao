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
import { DecisionTopicId, useTasks } from "@store/tasks";
import { useVotings } from "@store/votings";
import { E8s } from "@utils/math";
import { Result, TTaskId } from "@utils/types";
import { batch, createSignal, For, onMount, Show } from "solid-js";

export interface ICreateTaskFormProps {
  id?: TTaskId;
}

type FieldType =
  | "Dfinity Forum Link"
  | "Fort Major Site Link"
  | "Custom Text"
  | "Twitter Link"
  | "Github Link"
  | "Notion Link"
  | "Figma Link"
  | "Custom Link";

export function CreateTaskForm(props: ICreateTaskFormProps) {
  const { tasks, fetchTasks, editTask, createTask, deleteTask } = useTasks();
  const { decisionTopics, fetchDecisionTopics } = useVotings();

  onMount(() => {
    if (!task() && props.id) fetchTasks([props.id]);
    if (!decisionTopics[0]) fetchDecisionTopics();
  });

  const task = () => (props.id ? tasks[props.id.toString()] : undefined);

  const defaultTitle = () => (task() ? task()!.title : "");
  const defaultTeamOnly = () =>
    task() ? !!task()!.solver_constraints.find((it) => "TeamOnly" in it) : true;
  const defaultDescription = () => (task() ? task()!.description : "");
  const defaultDaysToSolve = () => (task() ? Number(task()!.days_to_solve) : 7);
  const defaultMaxSolutionsNum = () => {
    const t = task();
    if (!t) return 100;

    const found = t.solver_constraints.find(
      (it) => "MaxSolutions" in it
    )?.MaxSolutions;

    return found ? found : 100;
  };
  const defaultHoursReward = () => (task() ? task()!.hours_base : E8s.zero());
  const defaultStorypointsBaseReward = () =>
    task() ? task()!.storypoints_base : E8s.zero();
  const defaultStorypointsAdditionalReward = () =>
    task() ? task()!.storypoints_ext_budget : E8s.zero();
  const defaultDecisionTopics = () => (task() ? task()!.decision_topics : []);
  const defaultAssignees = () =>
    task() ? Result.Ok(task()!.assignees![0].toText()) : Result.Ok("");
  const defaultFieldTypes = () => {
    const t = task();

    if (!t) return [];

    const res: Result<FieldType, FieldType>[] = [];

    for (let f of t.solution_fields) {
      if ("Md" in f.kind) {
        res.push(Result.Ok("Custom Text"));
        continue;
      }

      if ("Url" in f.kind) {
        const u = f.kind.Url.kind;

        if ("Any" in u) {
          res.push(Result.Ok("Custom Link"));
        } else if ("Github" in u) {
          res.push(Result.Ok("Github Link"));
        } else if ("Twitter" in u) {
          res.push(Result.Ok("Twitter Link"));
        } else if ("Figma" in u) {
          res.push(Result.Ok("Figma Link"));
        } else if ("Notion" in u) {
          res.push(Result.Ok("Notion Link"));
        } else if ("FortMajorSite" in u) {
          res.push(Result.Ok("Fort Major Site Link"));
        } else if ("DfinityForum" in u) {
          res.push(Result.Ok("Dfinity Forum Link"));
        }
      }
    }

    return res;
  };
  const defaultFieldNames = () =>
    task() ? task()!.solution_fields.map((it) => Result.Ok(it.name)) : [];
  const defaultFieldDescription = () =>
    task()
      ? task()!.solution_fields.map((it) => Result.Ok(it.description))
      : [];
  const defaultFieldRequiredFlags = () =>
    task() ? task()!.solution_fields.map((it) => it.required) : [];

  const [disabled, setDisabled] = createSignal(false);
  const [title, setTitle] = createSignal<Result<string, string>>(
    Result.Ok(defaultTitle())
  );
  const [teamOnly, setTeamOnly] = createSignal(defaultTeamOnly());
  const [description, setDescription] = createSignal<Result<string, string>>(
    Result.Ok(defaultDescription())
  );
  const [daysToSolve, setDaysToSolve] = createSignal<Result<number, number>>(
    Result.Ok(defaultDaysToSolve())
  );
  const [maxSolutionsNum, setMaxSolutionsNum] = createSignal<
    Result<number, number>
  >(Result.Ok(defaultMaxSolutionsNum()));
  const [hoursReward, setHoursReward] = createSignal<Result<E8s, E8s>>(
    Result.Ok(defaultHoursReward())
  );
  const [storypointsBaseReward, setStorypointsBaseRewards] = createSignal<
    Result<E8s, E8s>
  >(Result.Ok(defaultStorypointsBaseReward()));
  const [storypointsAdditionalReward, setStorypointsAdditionalRewards] =
    createSignal<Result<E8s, E8s>>(
      Result.Ok(defaultStorypointsAdditionalReward())
    );
  const [topics, setTopics] = createSignal(defaultDecisionTopics());
  const [assignee, setAssignee] = createSignal<
    Result<string | undefined, string | undefined>
  >(defaultAssignees());

  const [fieldTypes, setFieldsTypes] = createSignal<
    Result<FieldType, FieldType>[]
  >(defaultFieldTypes());
  const [fieldNames, setFieldNames] = createSignal<Result<string, string>[]>(
    defaultFieldNames()
  );
  const [fieldDescriptions, setFieldDescriptions] = createSignal<
    Result<string, string>[]
  >(defaultFieldDescription());
  const [fieldRequiredFlags, setFieldRequiredFlags] = createSignal<boolean[]>(
    defaultFieldRequiredFlags()
  );

  const isErr = () => {
    return (
      title().isErr() ||
      description().isErr() ||
      daysToSolve().isErr() ||
      maxSolutionsNum().isErr() ||
      hoursReward().isErr() ||
      storypointsBaseReward().isErr() ||
      storypointsAdditionalReward().isErr() ||
      fieldTypes().some((it) => it.isErr()) ||
      fieldNames().some((it) => it.isErr()) ||
      fieldDescriptions().some((it) => it.isErr()) ||
      assignee().isErr() ||
      topics().length === 0
    );
  };

  const canSubmit = () => !props.id || (task() && "Edit" in task()!.stage);

  const handleFieldTypeChange = (idx: number, res: Result<string, string>) => {
    setFieldsTypes((v) => {
      v[idx] = res as Result<FieldType, FieldType>;
      return v;
    });
  };

  const handleFieldNameChange = (idx: number, res: Result<string, string>) => {
    setFieldNames((v) => {
      v[idx] = res;
      return v;
    });
  };

  const handleFieldDescriptionChange = (
    idx: number,
    res: Result<string, string>
  ) => {
    setFieldDescriptions((v) => {
      v[idx] = res;
      return v;
    });
  };

  const handleFieldRequiredFlags = (idx: number, res: boolean) => {
    setFieldRequiredFlags((v) => {
      v[idx] = res;
      return v;
    });
  };

  const handleAddFieldClick = () => {
    batch(() => {
      setFieldsTypes((v) => {
        v.push(Result.Ok("Twitter Link"));
        return v;
      });
      setFieldNames((v) => {
        v.push(Result.Ok("Example Field Name"));
        return v;
      });
      setFieldDescriptions((v) => {
        v.push(Result.Ok("Example Field Description"));
        return v;
      });
      setFieldRequiredFlags((v) => {
        v.push(true);
        return v;
      });
    });
  };

  const handleDeleteFieldClick = (idx: number) => {
    batch(() => {
      setFieldsTypes((v) => {
        v.splice(idx, 1);
        return v;
      });
      setFieldNames((v) => {
        v.splice(idx, 1);
        return v;
      });
      setFieldDescriptions((v) => {
        v.splice(idx, 1);
        return v;
      });
      setFieldRequiredFlags((v) => {
        v.splice(idx, 1);
        return v;
      });
    });
  };

  const field = (idx: number) => {
    return (
      <div class="flex gap-2 self-stretch">
        <Select
          value={fieldTypes()[idx].unwrap()}
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
          disabled={disabled()}
        />
        <TextInput
          value={fieldNames()[idx].unwrap()}
          onChange={(v) => handleFieldNameChange(idx, v)}
          validations={[{ minLen: 1 }, { maxLen: 64 }]}
          placeholder="Field Name"
          disabled={disabled()}
        />
        <TextInput
          value={fieldDescriptions()[idx].unwrap()}
          onChange={(v) => handleFieldDescriptionChange(idx, v)}
          validations={[{ minLen: 16 }, { maxLen: 512 }]}
          placeholder="Field Description"
          disabled={disabled()}
        />
        <BooleanInput
          value={fieldRequiredFlags()[idx]}
          onChange={(v) => handleFieldRequiredFlags(idx, v)}
          labelOff="Optional"
          labelOn="Required"
          disabled={disabled()}
        />
        <Btn
          icon={EIconKind.Minus}
          onClick={() => handleDeleteFieldClick(idx)}
          disabled={disabled()}
        />
      </div>
    );
  };

  const handleCreateClick = async () => {
    if (isErr()) return;

    setDisabled(true);

    const constraints: SolverConstraint[] = [
      { MaxSolutions: maxSolutionsNum().unwrapOk() },
    ];
    if (teamOnly()) {
      constraints.push({ TeamOnly: null });
    }

    const fields: SolutionField[] = [];
    for (let i = 0; i < fieldTypes().length; i++) {
      let kind: SolutionFieldKind = { Url: { kind: { Any: null } } };
      const ty = fieldTypes()[i].unwrapOk();

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

      fields.push({
        kind,
        name: fieldNames()[i].unwrapOk(),
        description: fieldDescriptions()[i].unwrapOk(),
        required: fieldRequiredFlags()[i],
      });
    }

    const assig = assignee().unwrapOk();

    if (!props.id) {
      await createTask({
        title: title().unwrapOk(),
        description: title().unwrapOk(),
        days_to_solve: BigInt(daysToSolve().unwrapOk()),
        solver_constraints: constraints,
        hours_base: hoursReward().unwrapOk(),
        storypoints_base: storypointsBaseReward().unwrapOk(),
        storypoints_ext_budget: storypointsAdditionalReward().unwrapOk(),
        solution_fields: fields,
        assignees: assig ? [Principal.fromText(assig)] : undefined,
        decision_topics: topics(),
      });
    } else {
      await editTask({
        id: props.id,
        new_title: title().unwrapOk(),
        new_description: title().unwrapOk(),
        new_days_to_solve: BigInt(daysToSolve().unwrapOk()),
        new_solver_constraints: constraints,
        new_hours_base: hoursReward().unwrapOk(),
        new_storypoints_base: storypointsBaseReward().unwrapOk(),
        new_storypoints_ext_budget: storypointsAdditionalReward().unwrapOk(),
        new_solution_fields: fields,
        new_assignees: assig ? [Principal.fromText(assig)] : null,
        new_decision_topics: topics(),
      });
    }

    setDisabled(false);
  };

  const handleDeleteClick = async () => {
    const agreed = confirm(
      `Are you sure you want to delete task #${props.id!}? This action is irreversible.`
    );

    if (!agreed) return;

    setDisabled(true);
    await deleteTask(props.id!);
    setDisabled(false);
  };

  const handleTopicSelect = (id: DecisionTopicId) => {
    setTopics((v) => {
      const idx = v.indexOf(id);
      if (idx == -1) v.push(id);
      else v.splice(idx, 1);

      return v;
    });
  };

  const fieldClass = "flex flex-col gap-2";

  return (
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <div class={fieldClass}>
          <Title text="Title" />
          <TextInput
            validations={[{ required: null }, { minLen: 1 }, { maxLen: 256 }]}
            value={title().unwrap()}
            onChange={setTitle}
            disabled={disabled()}
          />
        </div>
        <div class={fieldClass}>
          <Title text="Team Only" />
          <BooleanInput
            labelOff="Public"
            labelOn="Team Only"
            value={teamOnly()}
            onChange={setTeamOnly}
            disabled={disabled()}
          />
        </div>
      </div>
      <div class={fieldClass}>
        <Title text="Topics" />
        <div class="flex gap-3 flex-wrap">
          <For each={Object.keys(decisionTopics).map(parseInt)}>
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
        <Title text="Description" />
        <MdInput
          validations={[{ required: null }, { minLen: 16 }, { maxLen: 4096 }]}
          value={description().unwrap()}
          onChange={setDescription}
          disabled={disabled()}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Days To Solve" />
        <QtyInput
          symbol="Days"
          validations={[{ min: 0 }, { max: 90 }]}
          value={daysToSolve().unwrap()}
          onChange={setDaysToSolve}
          disabled={disabled()}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Max Solutions Number" />
        <QtyInput
          symbol="Solutions"
          validations={[{ min: 1 }, { max: 1000 }]}
          value={maxSolutionsNum().unwrap()}
          onChange={setMaxSolutionsNum}
          disabled={disabled()}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Hours Reward" />
        <QtyInput
          symbol={EE8sKind.Hours}
          validations={[{ max: E8s.fromBigIntBase(40n) }]}
          value={hoursReward().unwrap()}
          onChange={setHoursReward}
          disabled={disabled()}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Storypoints Base Reward" />
        <QtyInput
          symbol={EE8sKind.Storypoints}
          validations={[{ max: E8s.fromBigIntBase(100n) }]}
          value={storypointsBaseReward().unwrap()}
          onChange={setStorypointsBaseRewards}
          disabled={disabled()}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Storypoints Max Additional Reward" />
        <QtyInput
          symbol={EE8sKind.Storypoints}
          validations={[{ max: E8s.fromBigIntBase(100n) }]}
          value={storypointsAdditionalReward().unwrap()}
          onChange={setStorypointsAdditionalRewards}
          disabled={disabled()}
        />
      </div>
      <div class={fieldClass}>
        <Title text="Solution Fields" />
        <div class="flex flex-col gap-2 justify-end">
          <For each={fieldNames()}>{(_, idx) => field(idx())}</For>
          <Btn
            icon={EIconKind.Plus}
            onClick={handleAddFieldClick}
            disabled={disabled()}
          />
        </div>
      </div>
      <div class="flex gap-2">
        <Btn
          text={props.id === undefined ? "Create Task" : "Edit Task"}
          disabled={(isErr() || disabled()) && canSubmit()}
          onClick={handleCreateClick}
        />
        <Show when={props.id !== undefined}>
          <Btn
            text="Delete Task"
            disabled={disabled()}
            onClick={handleDeleteClick}
          />
        </Show>
      </div>
    </div>
  );
}
