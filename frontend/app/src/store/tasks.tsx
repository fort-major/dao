import { createContext, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import {
  ITask,
  ITaskTag,
  fetchMockTags,
  fetchMockTasks,
} from "../data/entities/task";
import { IChildren, TTaskId, TTaskTagId } from "../utils/types";
import { ErrorCode, err } from "../utils/error";

type TasksStore = Partial<Record<TTaskId, ITask>>;
type TaskTagsStore = Partial<Record<TTaskTagId, ITaskTag>>;

export interface ITaskStoreContext {
  tasks: Store<TasksStore>;
  fetchTasks: (ids: TTaskId[]) => Promise<void>;

  taskTags: Store<TaskTagsStore>;
  fetchTaskTags: (ids: TTaskTagId[]) => Promise<void>;
}

const TaskContext = createContext<ITaskStoreContext>();

export function useTasks(): ITaskStoreContext {
  const ctx = useContext(TaskContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Task context is not initialized");
  }

  return ctx;
}

export function TaskStore(props: IChildren) {
  const [tasks, setTasks] = createStore<TasksStore>();
  const [taskTags, setTaskTags] = createStore<TaskTagsStore>();

  const fetchTasks = async (ids: TTaskId[]) => {
    const tasks = await fetchMockTasks();

    for (let task of tasks) {
      setTasks(task.id, task);
    }
  };

  const fetchTaskTags = async (ids: TTaskTagId[]) => {
    const tags = await fetchMockTags(ids);

    for (let tag of tags) {
      setTaskTags(tag.id, tag);
    }
  };

  return (
    <TaskContext.Provider
      value={{ tasks, fetchTasks, taskTags, fetchTaskTags }}
    >
      {props.children}
    </TaskContext.Provider>
  );
}
