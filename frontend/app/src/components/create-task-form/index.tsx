import { BooleanInput } from "@components/boolean-input";
import { Btn } from "@components/btn";
import { EE8sKind } from "@components/e8s-widget";
import { EIconKind } from "@components/icon";
import { MdInput } from "@components/md-input";
import { QtyInput } from "@components/qty-input";
import { TextInput } from "@components/text-input";
import { Title } from "@components/title";
import { useTasks } from "@store/tasks";
import { TTaskId } from "@utils/types";
import { createSignal } from "solid-js";

export interface ICreateTaskFormProps {
  id?: TTaskId;
}

export function CreateTaskForm(props: ICreateTaskFormProps) {
  const { tasks, fetchTasks } = useTasks();

  const [title, setTitle] = createSignal<string | undefined>();

  const fieldClass = "flex flex-col gap-2";

  return (
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <div class={fieldClass}>
          <Title text="Title" />
          <TextInput
            validations={[{ required: null }, { minLen: 1 }, { maxLen: 256 }]}
            value={title}
          />
        </div>
        <div class={fieldClass}>
          <Title text="Team Only" />
          <BooleanInput labels={["Public", "Team Only"]} />
        </div>
      </div>
      <div class={fieldClass}>
        <Title text="Description" />
        <MdInput />
      </div>
      <div class={fieldClass}>
        <Title text="Days To Solve" />
        <QtyInput symbol="Days" mode="num" />
      </div>
      <div class={fieldClass}>
        <Title text="Max Solutions Number" />
        <QtyInput symbol="Solutions" mode="num" />
      </div>
      <div class={fieldClass}>
        <Title text="Hours Reward" />
        <QtyInput symbol={EE8sKind.Hours} />
      </div>
      <div class={fieldClass}>
        <Title text="Storypoints Base Reward" />
        <QtyInput symbol={EE8sKind.Storypoints} />
      </div>
      <div class={fieldClass}>
        <Title text="Storypoints Additional Reward" />
        <QtyInput symbol={EE8sKind.Storypoints} />
      </div>
      <div class={fieldClass}>
        <Title text="Solution Fields" />
        <div>
          <Btn icon={EIconKind.Plus} />
        </div>
      </div>
    </div>
  );
}
