import { For, createEffect } from "solid-js";
import { useAuth } from "../../store/auth";
import { useTasks } from "../../store/tasks";
import { Task } from "../../components/task";

export function TasksPage() {
  const { isReadyToFetch } = useAuth();
  const {
    tasks,
    taskIds,
    archivedTasks,
    archivedTaskIds,
    fetchTaskIds,
    fetchTasks,
    fetchArchivedTasks,
    fetchArchivedTaskIds,
  } = useTasks();

  const getTasks = () => Object.values(tasks);
  const getArchivedTasks = () => Object.values(archivedTasks);

  createEffect(async () => {
    if (!isReadyToFetch()) return;

    const p1 = taskIds.length == 0 ? fetchTaskIds() : Promise.resolve();
    const p2 =
      archivedTaskIds.length == 0 ? fetchArchivedTaskIds() : Promise.resolve();

    await Promise.all([p1, p2]);

    const p3 = fetchTasks();
    const p4 = fetchArchivedTasks();

    await Promise.all([p3, p4]);
  });

  return (
    <main>
      <h2>Tasks</h2>
      <div>
        <div>
          <h4>{taskIds.length}</h4>
          <p>tasks in progress</p>
        </div>
        <div>
          <h4>{archivedTaskIds.length}</h4>
          <p>tasks done</p>
        </div>
      </div>
      <div>
        <For each={getTasks()}>{(task) => <Task task={task} />}</For>
        <For each={getArchivedTasks()}>{(task) => <Task task={task} />}</For>
      </div>
    </main>
  );
}
