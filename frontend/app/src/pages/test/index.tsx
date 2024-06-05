import { For, Show, createEffect, onMount } from "solid-js";
import { Task } from "../../components/task";
import { useTasks } from "../../store/tasks";

export function TestPage() {
  const { tasks, fetchTasks } = useTasks();

  const taskIds = () => Object.keys(tasks);

  onMount(() => {
    fetchTasks([1, 2, 3]);
  });

  return (
    <main>
      <section>
        <Show when={taskIds().length > 0} fallback={<p>Loading task...</p>}>
          <For each={taskIds()}>
            {(taskId) => <Task task={tasks[taskId]} />}
          </For>
        </Show>
      </section>
    </main>
  );
}
