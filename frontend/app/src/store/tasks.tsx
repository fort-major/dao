import { createContext, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import {
  ITask,
  ITaskTag,
  fetchMockTags,
  fetchMockTasks,
} from "../data/entities/task";
import { IChildren, TCommentId, TTaskId, TTaskTagId } from "../utils/types";
import { ErrorCode, err } from "../utils/error";
import { IComment, fetchMockComments } from "../data/entities/comment";

type TasksStore = Partial<Record<TTaskId, ITask>>;
type TaskTagsStore = Partial<Record<TTaskTagId, ITaskTag>>;
type TaskCommentStore = Partial<Record<TCommentId, IComment>>;

export interface ITaskStoreContext {
  tasks: Store<TasksStore>;
  fetchTasks: (ids: TTaskId[]) => Promise<void>;

  taskTags: Store<TaskTagsStore>;
  fetchTaskTags: (ids: TTaskTagId[]) => Promise<void>;

  taskComments: Store<TaskCommentStore>;
  fetchTaskComments: (ids: TCommentId[]) => Promise<void>;
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
  const [taskComments, setTaskComments] = createStore<TaskCommentStore>();

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

  const fetchTaskComments = async (ids: TCommentId[]) => {
    const comments = await fetchMockComments(ids);

    for (let comment of comments) {
      setTaskComments(comment.id, comment);
    }
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        fetchTasks,
        taskTags,
        fetchTaskTags,
        taskComments,
        fetchTaskComments,
      }}
    >
      {props.children}
    </TaskContext.Provider>
  );
}
