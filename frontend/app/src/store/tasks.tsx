import { Accessor, createContext, createSignal, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TPrincipalStr } from "../utils/types";
import { ErrorCode, err, logErr } from "../utils/error";
import { Principal } from "@dfinity/principal";
import { useAuth } from "./auth";
import { E8s } from "../utils/math";
import {
  SolutionField,
  SolverConstraint,
  Task,
  TaskStage,
  ArchivedTask,
  ArchivedTaskV1,
} from "../declarations/tasks/tasks.did";
import { newTasksActor, optUnwrap } from "../utils/backend";
import { debugStringify } from "../utils/encoding";

export interface ISolution {
  evaluation?: E8s;
  attached_at: bigint;
  reward_hours?: E8s;
  fields: Array<string | undefined>;
  rejected: boolean;
  reward_storypoints?: E8s;
}

export interface ITask {
  id: TTaskId;
  title: string;
  creator: Principal;
  storypoints_base: E8s;
  days_to_solve: bigint;
  hours_base: E8s;
  description: string;
  created_at: bigint;
  stage: TaskStage;
  solvers: Array<Principal>;
  storypoints_ext_budget: E8s;
  solution_fields: Array<SolutionField>;
  solver_constraints: Array<SolverConstraint>;
  solutions: Array<[Principal, ISolution]>;
}

export interface IArchivedTaskV1 {
  id: TTaskId;
  title: string;
  creator: Principal;
  description: string;
  created_at: bigint;
  solver_constraints: Array<SolverConstraint>;
  solution_fields: Array<SolutionField>;
  solutions: Array<[Principal, ISolution]>;
}

type TTaskId = bigint;
type TTaskIdStr = string;
type TasksStore = Partial<Record<TTaskIdStr, ITask>>;
type ArchivedTasksStore = Partial<Record<TTaskIdStr, IArchivedTaskV1>>;
type TaskIdsStore = TTaskId[];

export interface ITasksStoreContext {
  taskIds: Store<TaskIdsStore>;
  fetchTaskIds: () => Promise<void>;
  tasks: Store<TasksStore>;
  fetchTasks: (ids?: TTaskId[]) => Promise<void>;
  archivedTaskIds: Store<TaskIdsStore>;
  fetchArchivedTaskIds: () => Promise<void>;
  archivedTasks: Store<ArchivedTasksStore>;
  fetchArchivedTasks: (ids?: TTaskId[]) => Promise<void>;
}

const TasksContext = createContext<ITasksStoreContext>();

export function useTasks(): ITasksStoreContext {
  const ctx = useContext(TasksContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Tasks context is not initialized");
  }

  return ctx;
}

export function TasksStore(props: IChildren) {
  const { anonymousAgent, assertReadyToFetch } = useAuth();

  const [tasks, setTasks] = createStore<TasksStore>();
  const [taskIds, setTaskIds] = createStore<TaskIdsStore>([]);
  const [archivedTasks, setArchivedTasks] = createStore<ArchivedTasksStore>();
  const [archivedTaskIds, setArchivedTaskIds] = createStore<TaskIdsStore>([]);

  const fetchTaskIds: ITasksStoreContext["fetchTaskIds"] = async () => {
    assertReadyToFetch();

    const tasksActor = newTasksActor(anonymousAgent()!);
    const { ids } = await tasksActor.tasks__get_task_ids({});

    setTaskIds(ids);
  };

  const fetchTasks: ITasksStoreContext["fetchTasks"] = async (ids) => {
    assertReadyToFetch();

    if (!ids) {
      ids = taskIds;
    }

    const tasksActor = newTasksActor(anonymousAgent()!);
    const { tasks } = await tasksActor.tasks__get_tasks({ ids });

    for (let i = 0; i < tasks.length; i++) {
      const task = optUnwrap(tasks[i]);

      if (!task) {
        err(ErrorCode.UNREACHEABLE, `Task ${ids[i]} not found`);
      }

      const solutions: [Principal, ISolution][] = task.solutions.map(
        ([solver, solution]) => {
          const evaluation = optUnwrap(solution.evaluation);
          const hours = optUnwrap(solution.reward_hours);
          const storypoints = optUnwrap(solution.reward_storypoints);

          const sol: ISolution = {
            fields: solution.fields.map(optUnwrap),
            attached_at: solution.attached_at,
            rejected: solution.rejected,
            evaluation: evaluation ? new E8s(evaluation) : undefined,
            reward_hours: hours ? new E8s(hours) : undefined,
            reward_storypoints: storypoints ? new E8s(storypoints) : undefined,
          };

          return [solver, sol];
        }
      );

      const itask: ITask = {
        id: task.id,
        solution_fields: task.solution_fields,
        title: task.title,
        description: task.description,
        creator: task.creator,
        created_at: task.created_at,
        stage: task.stage,
        solver_constraints: task.solver_constraints,
        storypoints_base: new E8s(task.storypoints_base),
        storypoints_ext_budget: new E8s(task.storypoints_ext_budget),
        hours_base: new E8s(task.hours_base),
        days_to_solve: task.days_to_solve,
        solvers: task.solvers,
        solutions,
      };

      setTasks(itask.id.toString(), itask);
    }
  };

  const fetchArchivedTaskIds: ITasksStoreContext["fetchArchivedTaskIds"] =
    async () => {
      assertReadyToFetch();

      const tasksActor = newTasksActor(anonymousAgent()!);
      const { ids } = await tasksActor.tasks__get_archived_task_ids({});

      setArchivedTaskIds(ids);
    };

  const fetchArchivedTasks: ITasksStoreContext["fetchArchivedTasks"] = async (
    ids
  ) => {
    assertReadyToFetch();

    if (!ids) {
      ids = archivedTaskIds;
    }

    const tasksActor = newTasksActor(anonymousAgent()!);
    const { tasks } = await tasksActor.tasks__get_archived_tasks({ ids });

    for (let i = 0; i < tasks.length; i++) {
      const task = optUnwrap(tasks[i]);

      if (!task) {
        logErr(ErrorCode.UNREACHEABLE, `Archived task ${ids[i]} not found`);
        continue;
      }

      if ("V0001" in task) {
        const taskV1 = task.V0001;

        const solutions: [Principal, ISolution][] = taskV1.solutions.map(
          ([solver, solution]) => {
            const evaluation = optUnwrap(solution.evaluation);
            const hours = optUnwrap(solution.reward_hours);
            const storypoints = optUnwrap(solution.reward_storypoints);

            const sol: ISolution = {
              fields: solution.fields.map(optUnwrap),
              attached_at: solution.attached_at,
              rejected: solution.rejected,
              evaluation: evaluation ? new E8s(evaluation) : undefined,
              reward_hours: hours ? new E8s(hours) : undefined,
              reward_storypoints: storypoints
                ? new E8s(storypoints)
                : undefined,
            };

            return [solver, sol];
          }
        );

        const itask: IArchivedTaskV1 = {
          id: taskV1.id,
          title: taskV1.title,
          description: taskV1.description,
          created_at: taskV1.created_at,
          creator: taskV1.creator,
          solver_constraints: taskV1.solver_constraints,
          solution_fields: taskV1.solution_fields,
          solutions,
        };

        setArchivedTasks(itask.id.toString(), itask);

        continue;
      }

      logErr(
        ErrorCode.UNKNOWN,
        `Unknown archived task version received: ${debugStringify(task)}`
      );
    }
  };

  return (
    <TasksContext.Provider
      value={{
        tasks,
        fetchTasks,
        taskIds,
        fetchTaskIds,
        archivedTaskIds,
        fetchArchivedTaskIds,
        archivedTasks,
        fetchArchivedTasks,
      }}
    >
      {props.children}
    </TasksContext.Provider>
  );
}
