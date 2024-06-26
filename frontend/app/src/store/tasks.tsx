import { createContext, useContext } from "solid-js";
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
import { newTasksActor, opt, optUnwrap } from "../utils/backend";
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

export interface ICreateTaskArgs {
  title: string;
  description: string;
  solution_fields: Array<SolutionField>;
  solver_constraints: Array<SolverConstraint>;
  days_to_solve: bigint;
  storypoints_base: E8s;
  hours_base: E8s;
  storypoints_ext_budget: E8s;
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
  createTask: (args: ICreateTaskArgs) => Promise<TTaskId>;
  editTask: (args: IEditTaskArgs) => Promise<void>;
  deleteTask: (taskId: TTaskId) => Promise<void>;
  attachToTask: (taskId: TTaskId) => Promise<void>;
  solveTask: (
    taskId: TTaskId,
    filledInFields?: (string | undefined)[]
  ) => Promise<void>;
  finishSolveTask: (taskId: TTaskId) => Promise<void>;
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
  const {
    anonymousAgent,
    assertReadyToFetch,
    assertAuthorized,
    assertWithProof,
    agent,
    profileProofCert,
    profileProof,
    identity,
  } = useAuth();

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
          const evaluation = optUnwrap(solution.evaluation.map(E8s.new));
          const hours = optUnwrap(solution.reward_hours.map(E8s.new));
          const storypoints = optUnwrap(
            solution.reward_storypoints.map(E8s.new)
          );

          const sol: ISolution = {
            fields: solution.fields.map(optUnwrap),
            attached_at: solution.attached_at,
            rejected: solution.rejected,
            evaluation,
            reward_hours: hours,
            reward_storypoints: storypoints,
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
            const evaluation = optUnwrap(solution.evaluation.map(E8s.new));
            const hours = optUnwrap(solution.reward_hours.map(E8s.new));
            const storypoints = optUnwrap(
              solution.reward_storypoints.map(E8s.new)
            );

            const sol: ISolution = {
              fields: solution.fields.map(optUnwrap),
              attached_at: solution.attached_at,
              rejected: solution.rejected,
              evaluation,
              reward_hours: hours,
              reward_storypoints: storypoints,
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

  const createTask: ITasksStoreContext["createTask"] = async (args) => {
    assertAuthorized();
    assertWithProof();

    const proof = profileProof()!;

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
      team_proof: { cert_raw: profileProofCert()!, profile_proof: [] },
    });

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
    await tasksActor.tasks__attach_to_task({ id: taskId, detach });
  };

  // if undefined - delete the solution
  const solveTask: ITasksStoreContext["solveTask"] = async (
    taskId,
    filledInFields
  ) => {
    assertAuthorized();
    assertWithProof();

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

    if (
      task.solver_constraints.find((it) => "TeamOnly" in it) &&
      !profileProof()!.is_team_member
    ) {
      err(ErrorCode.AUTH, "This task can only be solved by a team member");
    }

    const tasksActor = newTasksActor(agent()!);
    await tasksActor.tasks__solve_task({
      id: taskId,
      filled_in_fields_opt: filledInFields ? [filledInFields.map(opt)] : [],
      proof: [{ cert_raw: profileProofCert()!, profile_proof: [] }],
    });
  };

  const finishSolveTask: ITasksStoreContext["finishSolveTask"] = async (
    taskId
  ) => {
    assertAuthorized();
    assertWithProof();

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

    if (!profileProof()!.is_team_member) {
      err(
        ErrorCode.AUTH,
        "Only team members can transition the task to the evaluation stage"
      );
    }

    const tasksActor = newTasksActor(anonymousAgent()!);
    await tasksActor.tasks__finish_solve_task({
      id: taskId,
      proof: { cert_raw: profileProofCert()!, profile_proof: [] },
    });
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
        createTask,
        editTask,
        deleteTask,
        attachToTask,
        solveTask,
        finishSolveTask,
      }}
    >
      {props.children}
    </TasksContext.Provider>
  );
}
