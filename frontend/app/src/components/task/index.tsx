import { For, Show, onMount } from "solid-js";
import { SolidMarkdown } from "solid-markdown";
import {
  ITask,
  ITaskInternalDetails,
  taskKind,
} from "../../data/entities/task";
import { Chip, ChipSkeleton } from "../chip";
import { useTasks } from "../../store/tasks";
import remarkGFM from "remark-gfm";

export interface ITaskProps {
  task: ITask;
}

export function InternalTaskDetails(props: ITaskInternalDetails) {
  return (
    <div>
      <p>Sprint: {props.sprintId ? props.sprintId : "None"}</p>
      <p>Assegnee: {props.assignee}</p>
    </div>
  );
}

export function Task(props: ITaskProps) {
  const { taskTags, fetchTaskTags } = useTasks();

  const taskTagIds = () => Object.keys(taskTags);

  onMount(() => {
    fetchTaskTags(props.task.tagIds);
  });

  return (
    <div class="w-full rounded-md bg-white shadow-md p-3 flex flex-col gap-3">
      <div class="flex flex-row items-baseline gap-2">
        <p class="font-sans font-thin text-gray-500 text-sm">
          {taskKind(props.task)}
        </p>
        <h4 class="font-sans font-medium text-3xl">{props.task.title}</h4>
      </div>
      <div class="flex flex-row gap-1">
        <Show when={taskTagIds().length > 0} fallback={<ChipSkeleton />}>
          <For each={taskTagIds()}>
            {(tagId) => (
              <Chip
                text={taskTags[tagId].name}
                bgColor={taskTags[tagId].color}
              />
            )}
          </For>
        </Show>
      </div>
      <SolidMarkdown
        class="md-content"
        remarkPlugins={[remarkGFM]}
        children={props.task.description}
      />
      <div></div>
    </div>
  );
}
