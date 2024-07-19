import {
  Accessor,
  batch,
  createContext,
  createEffect,
  createSignal,
  useContext,
} from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren } from "../utils/types";
import { ErrorCode, err, logErr } from "../utils/error";
import { Principal } from "@dfinity/principal";
import { useAuth } from "./auth";
import { E8s } from "../utils/math";
import {
  SolutionField,
  SolverConstraint,
  TaskStage,
} from "../declarations/tasks/tasks.did";
import {
  newTaskArchiveActor,
  newTasksActor,
  opt,
  optUnwrap,
} from "../utils/backend";
import { debugStringify } from "../utils/encoding";
import { debouncedBatchFetch } from "@utils/common";
import { getProfProof, getProfProofCert } from "@utils/security";

export interface ISolution {
  evaluation?: E8s;
  attached_at: bigint;
  reward_hours?: E8s;
  fields: Array<string>;
  rejected: boolean;
  reward_storypoints?: E8s;
  want_rep: boolean;
}

export type DecisionTopicId = number;

export interface ITask {
  id: TTaskId;
  title: string;
  description: string;
  stage: TaskStage;
  created_at: bigint;
  creator: Principal;
  storypoints_base: E8s;
  days_to_solve: bigint;
  hours_base: E8s;
  storypoints_ext_budget: E8s;
  solvers: Array<Principal>;
  solution_fields: Array<SolutionField>;
  solver_constraints: Array<SolverConstraint>;
  solutions: Array<[Principal, ISolution]>;
  decision_topics: DecisionTopicId[];
  assignees?: Principal[];
}

export function taskStageToOrd(s: TaskStage) {
  if ("Solve" in s) return 1;
  if ("Evaluate" in s) return 2;
  if ("PreSolve" in s) return 3;
  if ("Edit" in s) return 4;

  err(ErrorCode.UNREACHEABLE, "Invalid task stage " + debugStringify(s));
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
  decision_topics: DecisionTopicId[];
  assignees?: Principal[];
}

export interface ICreateTaskArgs {
  title: string;
  description: string;
  solution_fields: Array<SolutionField>;
  solver_constraints: Array<SolverConstraint>;
  days_to_solve: bigint;
  storypoints_base: E8s;
  hours_base: E8s;
  storypoints_ext_budget: E8s;
  decision_topics: DecisionTopicId[];
  assignees?: Principal[];
}

export interface IEditTaskArgs {
  id: bigint;
  new_title?: string;
  new_description?: string;
  new_solution_fields?: Array<SolutionField>;
  new_solver_constraints?: Array<SolverConstraint>;
  new_hours_base?: E8s;
  new_storypoints_base?: E8s;
  new_storypoints_ext_budget?: E8s;
  new_days_to_solve?: bigint;
  new_decision_topics?: DecisionTopicId[];
  // null - delete prev assignees, undefined - don't change anything
  new_assignees?: null | Principal[];
}

type TTaskId = bigint;
type TTaskIdStr = string;
type TasksStore = Partial<Record<TTaskIdStr, ITask>>;
type ArchivedTasksStore = Partial<Record<TTaskIdStr, IArchivedTaskV1>>;

export interface ITasksStoreContext {
  editTaskIds: TTaskId[];
  preSolveTaskIds: TTaskId[];
  solveTaskIds: TTaskId[];
  evaluateTaskIds: TTaskId[];
  fetchTaskIds: (status: TTaskStatus) => Promise<boolean>;
  tasks: Store<TasksStore>;
  fetchTasksById: (ids: TTaskId[]) => Promise<void>;
  archivedTaskIds: TTaskId[];
  fetchArchivedTaskIds: () => Promise<boolean>;
  archivedTasks: Store<ArchivedTasksStore>;
  fetchArchivedTasksById: (ids: TTaskId[]) => Promise<void>;
  createTask: (args: ICreateTaskArgs) => Promise<TTaskId>;
  editTask: (args: IEditTaskArgs) => Promise<void>;
  deleteTask: (taskId: TTaskId) => Promise<void>;
  attachToTask: (taskId: TTaskId) => Promise<void>;
  solveTask: (
    taskId: TTaskId,
    filledInFields?: (string | undefined)[],
    wantRep?: boolean
  ) => Promise<void>;
  taskStats: Accessor<ITaskStats>;
}

export interface ITaskStats {
  readyToSolveTasks: number;
  solvedTasks: number;
}

export type TTaskStatus =
  | "Edit"
  | "PreSolve"
  | "Solve"
  | "Evaluate"
  | "Archived";

const TasksContext = createContext<ITasksStoreContext>();

export function useTasks(): ITasksStoreContext {
  const ctx = useContext(TasksContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Tasks context is not initialized");
  }

  return ctx;
}

export function TasksStore(props: IChildren) {
  const {
    anonymousAgent,
    assertReadyToFetch,
    isReadyToFetch,
    assertAuthorized,
    agent,
    identity,
  } = useAuth();
  const [editTaskIds, setEditTaskIds] = createStore<TTaskId[]>([]);
  const [editTaskSkip, setEditTaskSkip] = createSignal(0);

  const [preSolveTaskIds, setPreSolveTaskIds] = createStore<TTaskId[]>([]);
  const [preSolveTaskSkip, setPreSolveTaskSkip] = createSignal(0);

  const [solveTaskIds, setSolveTaskIds] = createStore<TTaskId[]>([]);
  const [solveTaskSkip, setSolveTaskSkip] = createSignal(0);

  const [evaluateTaskIds, setEvaluateTaskIds] = createStore<TTaskId[]>([]);
  const [evaluateTaskSkip, setEvaluateTaskSkip] = createSignal(0);

  const [tasks, setTasks] = createStore<TasksStore>();

  const [archivedTaskIds, setArchivedTaskIds] = createStore<TTaskId[]>([]);
  const [archivedTaskSkip, setArchivedTaskSkip] = createSignal(0);
  const [archivedTasks, setArchivedTasks] = createStore<ArchivedTasksStore>();

  const [taskArchiveActor, setTaskArchiveActor] =
    createSignal<ReturnType<typeof newTaskArchiveActor>>();
  const [taskStats, setTaskStats] = createSignal<ITaskStats>({
    readyToSolveTasks: 0,
    solvedTasks: 0,
  });

  createEffect(() => {
    if (isReadyToFetch()) {
      setTaskArchiveActor(newTaskArchiveActor(anonymousAgent()!));
      fetchTaskStats();
    }
  });

  const fetchTaskStats = async () => {
    assertReadyToFetch();

    const tasksActor = newTasksActor(anonymousAgent()!);
    const resp = await tasksActor.tasks__get_tasks_stats({});

    setTaskStats({
      readyToSolveTasks: resp.ready_to_solve_tasks,
      solvedTasks: resp.solved_tasks,
    });

    let canisterId: Principal = resp.next;

    while (true) {
      const a = newTaskArchiveActor(anonymousAgent()!, canisterId);
      const res = await a.task_archive__get_archived_tasks_stats({});

      setTaskStats((v) => {
        v.solvedTasks += res.solved_tasks;
        return { ...v };
      });

      if (res.next.length === 1) {
        canisterId = res.next[0];
      } else {
        return;
      }
    }
  };

  const fetchTasksById: ITasksStoreContext["fetchTasksById"] = async (ids) => {
    assertReadyToFetch();

    tasksGetTasksById({ ids });
  };

  const fetchTaskIds: ITasksStoreContext["fetchTaskIds"] = async (status) => {
    assertReadyToFetch();

    const tasksActor = newTasksActor(anonymousAgent()!);

    let skip: number = 0;
    let stage: TaskStage = { Edit: null };

    switch (status) {
      case "Edit": {
        skip = editTaskSkip();
        stage = { Edit: null };
        break;
      }
      case "PreSolve": {
        skip = preSolveTaskSkip();
        stage = { PreSolve: null };
        break;
      }
      case "Solve": {
        skip = solveTaskSkip();
        stage = { Solve: { until_timestamp: 0n /* ignored on backend */ } };
        break;
      }
      case "Evaluate": {
        skip = evaluateTaskSkip();
        stage = { Evaluate: null };
        break;
      }
      case "Archived": {
        err(
          ErrorCode.UNREACHEABLE,
          "Use the specialized method to fetch archived tasks"
        );
      }
    }

    const { entries, pagination } = await tasksActor.tasks__get_tasks({
      pagination: {
        reversed: false,
        skip,
        take: 20,
      },
      filter: {
        Stage: stage,
      },
    });

    let result = true;
    if (pagination.left === 0) {
      result = false;
    }

    batch(() => {
      switch (status) {
        case "Edit": {
          setEditTaskIds((v) => {
            for (let entry of entries) {
              if (v.indexOf(entry) === -1) {
                v.push(entry);
              }
            }

            return [...v];
          });
          setEditTaskSkip((v) => v + entries.length);
          break;
        }
        case "PreSolve": {
          setPreSolveTaskIds((v) => {
            for (let entry of entries) {
              if (v.indexOf(entry) === -1) {
                v.push(entry);
              }
            }

            return [...v];
          });
          setPreSolveTaskSkip((v) => v + entries.length);
          break;
        }
        case "Solve": {
          setSolveTaskIds((v) => {
            for (let entry of entries) {
              if (v.indexOf(entry) === -1) {
                v.push(entry);
              }
            }

            return [...v];
          });
          setSolveTaskSkip((v) => v + entries.length);
          break;
        }
        case "Evaluate": {
          setEvaluateTaskIds((v) => {
            for (let entry of entries) {
              if (v.indexOf(entry) === -1) {
                v.push(entry);
              }
            }

            return [...v];
          });
          setEvaluateTaskSkip((v) => v + entries.length);
          break;
        }
      }
    });

    return result;
  };

  const fetchArchivedTasksById: ITasksStoreContext["fetchArchivedTasksById"] =
    async (ids) => {
      taskArchiveGetArchivedTasksById({ ids });
    };

  const fetchArchivedTaskIds: ITasksStoreContext["fetchArchivedTaskIds"] =
    async () => {
      assertReadyToFetch();

      const tasksActor = taskArchiveActor()!;

      const { entries, pagination } =
        await tasksActor.task_archive__get_archived_tasks({
          pagination: {
            reversed: false,
            skip: archivedTaskSkip(),
            take: 20,
          },
        });

      let result = true;
      if (pagination.left === 0) {
        if (pagination.next.length === 1) {
          setTaskArchiveActor(
            newTaskArchiveActor(anonymousAgent()!, pagination.next[0])
          );
        } else {
          result = false;
        }
      }

      setArchivedTaskIds((v) => {
        for (let entry of entries) {
          if (v.indexOf(entry) === -1) {
            v.push(entry);
          }
        }

        return [...v];
      });
      setArchivedTaskSkip((v) => v + entries.length);

      return result;
    };

  const createTask: ITasksStoreContext["createTask"] = async (args) => {
    assertAuthorized();

    const proof = await getProfProof(agent()!);

    if (!proof.is_team_member) {
      err(ErrorCode.AUTH, "Only team members can create new tasks");
    }

    const tasksActor = newTasksActor(agent()!);
    const { id } = await tasksActor.tasks__create_task({
      title: args.title,
      description: args.description,
      solution_fields: args.solution_fields,
      solver_constraints: args.solver_constraints,
      days_to_solve: args.days_to_solve,
      hours_base: args.hours_base.toBigIntRaw(),
      storypoints_base: args.storypoints_base.toBigIntRaw(),
      storypoints_ext_budget: args.storypoints_ext_budget.toBigIntRaw(),
      profile_proof: {
        body: [],
        cert_raw: await getProfProofCert(agent()!),
      },
      decision_topics: args.decision_topics,
      assignees: opt(args.assignees),
    });

    fetchTasksById([id]);

    return id;
  };

  const editTask: ITasksStoreContext["editTask"] = async (args) => {
    assertAuthorized();

    const task = tasks[args.id.toString()];

    if (!task) {
      err(
        ErrorCode.UNREACHEABLE,
        `The task ${args.id.toString()} is not fetched yet`
      );
    }

    if (!("Edit" in task.stage)) {
      err(
        ErrorCode.AUTH,
        "At this stage the task can only be edited by a voting"
      );
    }

    const principal = identity()!.getPrincipal();

    if (task.creator.compareTo(principal) !== "eq") {
      err(ErrorCode.AUTH, "Only the creator of the task can edit it");
    }

    const tasksActor = newTasksActor(agent()!);
    await tasksActor.tasks__edit_task({
      id: args.id,
      new_title_opt: opt(args.new_title),
      new_description_opt: opt(args.new_description),
      new_solution_fields_opt: opt(args.new_solution_fields),
      new_solver_constraints_opt: opt(args.new_solver_constraints),
      new_days_to_solve_opt: opt(args.new_days_to_solve),
      new_hours_base_opt: opt(args.new_hours_base?.toBigIntRaw()),
      new_storypoints_base_opt: opt(args.new_storypoints_base?.toBigIntRaw()),
      new_storypoints_ext_budget_opt: opt(
        args.new_storypoints_ext_budget?.toBigIntRaw()
      ),
      new_decision_topics_opt: opt(args.new_decision_topics),
      new_assignees_opt:
        args.new_assignees === undefined
          ? []
          : args.new_assignees === null
          ? [[]]
          : [[args.new_assignees]],
    });
  };

  const deleteTask: ITasksStoreContext["deleteTask"] = async (taskId) => {
    assertAuthorized();

    const task = tasks[taskId.toString()];

    if (!task) {
      err(
        ErrorCode.UNREACHEABLE,
        `The task ${taskId.toString()} is not fetched yet`
      );
    }

    if (!("Edit" in task.stage)) {
      err(
        ErrorCode.AUTH,
        "At this stage the task can only be deleted by a voting"
      );
    }

    const principal = identity()!.getPrincipal();

    if (task.creator.compareTo(principal) !== "eq") {
      err(ErrorCode.AUTH, "Only the creator of the task can delete it");
    }

    const tasksActor = newTasksActor(agent()!);

    await tasksActor.tasks__delete_task({ id: taskId });
  };

  const attachToTask: ITasksStoreContext["attachToTask"] = async (taskId) => {
    assertAuthorized();

    const task = tasks[taskId.toString()];

    if (!task) {
      err(
        ErrorCode.UNREACHEABLE,
        `The task ${taskId.toString()} is not fetched yet`
      );
    }

    const principal = identity()!.getPrincipal();

    const detach = !!task.solvers.find(
      (it) => it.compareTo(principal) === "eq"
    );

    const tasksActor = newTasksActor(agent()!);
    await tasksActor.tasks__attach_to_task({
      id: taskId,
      detach,
      proof: { cert_raw: await getProfProofCert(agent()!), body: [] },
    });
  };

  // if undefined - delete the solution
  const solveTask: ITasksStoreContext["solveTask"] = async (
    taskId,
    filledInFields,
    wantRep
  ) => {
    assertAuthorized();

    const task = tasks[taskId.toString()];

    if (!task) {
      err(
        ErrorCode.UNREACHEABLE,
        `The task ${taskId.toString()} is not fetched yet`
      );
    }

    if (!("Solve" in task.stage)) {
      err(ErrorCode.UNREACHEABLE, "The task can no longer be solved");
    }

    const proof = await getProfProof(agent()!);

    if (
      task.solver_constraints.find((it) => "TeamOnly" in it) &&
      !proof.is_team_member
    ) {
      err(ErrorCode.AUTH, "This task can only be solved by a team member");
    }

    if (
      task.assignees &&
      !task.assignees.find((it) => it.compareTo(proof.id) === "eq")
    ) {
      err(
        ErrorCode.AUTH,
        "This task can only be solved by a pre-defined set of assignees"
      );
    }

    const tasksActor = newTasksActor(agent()!);
    await tasksActor.tasks__solve_task({
      id: taskId,
      filled_in_fields_opt: filledInFields ? [filledInFields.map(opt)] : [],
      want_rep: !!wantRep,
      profile_proof: {
        body: [],
        cert_raw: await getProfProofCert(agent()!),
      },
    });
  };

  const tasksGetTasksById = debouncedBatchFetch(
    async function* (req: { ids: TTaskId[] }) {
      const tasksActor = newTasksActor(anonymousAgent()!);
      return tasksActor.tasks__get_tasks_by_id(req);
    },
    ({ entries: tasks }, { ids }) => {
      for (let i = 0; i < tasks.length; i++) {
        const task = optUnwrap(tasks[i]);

        if (!task) {
          taskArchiveGetArchivedTasksById({ ids: [ids[i]] });
          continue;
        }

        const solutions: [Principal, ISolution][] = task.solutions.map(
          ([solver, solution]) => {
            const evaluation = optUnwrap(solution.evaluation.map(E8s.new));
            const hours = optUnwrap(solution.reward_hours.map(E8s.new));
            const storypoints = optUnwrap(
              solution.reward_storypoints.map(E8s.new)
            );

            const sol: ISolution = {
              fields: solution.fields.map((it) => optUnwrap(it) ?? ""),
              attached_at: solution.attached_at,
              rejected: solution.rejected,
              evaluation,
              reward_hours: hours,
              reward_storypoints: storypoints,
              want_rep: solution.want_rep,
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
          storypoints_base: E8s.new(task.storypoints_base),
          storypoints_ext_budget: E8s.new(task.storypoints_ext_budget),
          hours_base: E8s.new(task.hours_base),
          days_to_solve: task.days_to_solve,
          solvers: task.solvers,
          solutions,
          decision_topics: task.decision_topics as number[],
          assignees: optUnwrap(task.assignees),
        };

        setTasks(itask.id.toString(), itask);
      }
    },
    (reason) => err(ErrorCode.NETWORK, `Unable to fetch tasks: ${reason}`)
  );

  const taskArchiveGetArchivedTasksById = debouncedBatchFetch(
    async function* (req: { ids: TTaskId[] }) {
      const _req = { ids: [...req.ids] };
      let canisterId: Principal | undefined = undefined;

      while (true) {
        const tasksActor = newTaskArchiveActor(anonymousAgent()!, canisterId);
        const resp = await tasksActor.task_archive__get_archived_tasks_by_id(
          _req
        );

        canisterId = optUnwrap(resp.next);

        for (let i = 0; i < resp.entries.length; i++) {
          if (resp.entries[i].length > 0) {
            const idToRemove = resp.entries[i][0]!.V0001.id;
            const idx = _req.ids.indexOf(idToRemove);
            if (idx >= 0) {
              _req.ids.splice(idx, 1);
            }
          }
        }

        if (_req.ids.length === 0) {
          return resp;
        } else {
          yield resp;
        }
      }
    },
    ({ entries: tasks }, _, done) => {
      for (let i = 0; i < tasks.length; i++) {
        const t = optUnwrap(tasks[i]);

        if (!t) {
          if (done) {
            err(ErrorCode.UNKNOWN, "Task not found");
          }

          continue;
        }

        if (!("V0001" in t)) {
          err(
            ErrorCode.UNREACHEABLE,
            `Archived Task version not supported ${t}`
          );
        }

        const task = t.V0001;

        const solutions: [Principal, ISolution][] = task.solutions.map(
          ([solver, solution]) => {
            const evaluation = optUnwrap(solution.evaluation.map(E8s.new));
            const hours = optUnwrap(solution.reward_hours.map(E8s.new));
            const storypoints = optUnwrap(
              solution.reward_storypoints.map(E8s.new)
            );

            const sol: ISolution = {
              fields: solution.fields.map((it) => optUnwrap(it) ?? ""),
              attached_at: solution.attached_at,
              rejected: solution.rejected,
              evaluation,
              reward_hours: hours,
              reward_storypoints: storypoints,
              want_rep: solution.want_rep,
            };

            return [solver, sol];
          }
        );

        const itask: IArchivedTaskV1 = {
          id: task.id,
          solution_fields: task.solution_fields,
          title: task.title,
          description: task.description,
          creator: task.creator,
          created_at: task.created_at,
          solver_constraints: task.solver_constraints,
          solutions,
          decision_topics: task.decision_topics as number[],
        };

        setArchivedTasks(itask.id.toString(), itask);
      }
    },
    (reason) =>
      err(ErrorCode.NETWORK, `Unable to fetch archived tasks: ${reason}`)
  );

  return (
    <TasksContext.Provider
      value={{
        editTaskIds,
        preSolveTaskIds,
        solveTaskIds,
        evaluateTaskIds,
        fetchTaskIds,
        tasks,
        fetchTasksById,
        archivedTaskIds,
        fetchArchivedTaskIds,
        archivedTasks,
        fetchArchivedTasksById,
        createTask,
        editTask,
        deleteTask,
        attachToTask,
        solveTask,
        taskStats,
      }}
    >
      {props.children}
    </TasksContext.Provider>
  );
}
