import { VotingId } from "@/declarations/votings/votings.did";
import { ROOT } from "@/routes";
import { AttentionMarker } from "@components/attention-marker";
import { BooleanInput } from "@components/boolean-input";
import { Btn } from "@components/btn";
import { Countdown, daysLeft, nowNs } from "@components/countdown";
import { getSolutionFieldType } from "@components/create-task-form";
import { DecisionTopic } from "@components/decision-topic";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { EIconKind, Icon } from "@components/icon";
import { MdPreview } from "@components/md-preview";
import { Modal } from "@components/modal";
import { ProfileMicro, ProfileMini } from "@components/profile/profile";
import { SolutionSubmitForm } from "@components/solution-submit-form";
import { TaskSolution } from "@components/task-solution";
import { Title } from "@components/title";
import { VotingWidget } from "@components/voting-widget";
import { A } from "@solidjs/router";
import { useAuth } from "@store/auth";
import { useHumans } from "@store/humans";
import { IArchivedTaskV1, ITask, TTaskStatus, useTasks } from "@store/tasks";
import { useVotings } from "@store/votings";
import { COLORS } from "@utils/colors";
import {
  decodeVotingId,
  encodeVotingId,
  timestampToStr,
} from "@utils/encoding";
import { logInfo } from "@utils/error";
import { E8s } from "@utils/math";
import { getProfProof } from "@utils/security";
import { TTaskId } from "@utils/types";
import {
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createResource,
  createSignal,
  on,
  onMount,
} from "solid-js";

export interface ITaskProps {
  id: TTaskId;
}

export function TaskMini(props: ITaskProps) {
  const { tasks, archivedTasks, fetchTasksById } = useTasks();
  const { meIsTeamMember } = useHumans();
  const { identity } = useAuth();
  const { actionableVotings } = useVotings();

  const [taskMarker, setTaskMaker] = createSignal(false);

  onMount(() => {
    if (!task()) fetchTasksById([props.id]);
  });

  createEffect(() => {
    if (stage() === "Archived") return;

    let taskM = false;

    for (let id of Object.keys(actionableVotings).map(decodeVotingId)) {
      if ("EvaluateTask" in id && props.id === id.EvaluateTask) {
        taskM = true;
      }

      if ("StartSolveTask" in id && props.id === id.StartSolveTask) {
        taskM = true;
      }

      if ("DeleteTask" in id && props.id === id.DeleteTask) {
        taskM = true;
      }
    }

    setTaskMaker(taskM);
  });

  const task = (): (Partial<ITask> & IArchivedTaskV1) | undefined =>
    tasks[props.id.toString()] || archivedTasks[props.id.toString()];

  const teamOnly = () =>
    !!task()?.solver_constraints.find((it) => "TeamOnly" in it);

  const meIsTaskCreator = () => {
    const me = identity()?.getPrincipal();
    if (!me) return false;

    const t = task();
    if (!t) return false;

    return t.creator.compareTo(me) === "eq";
  };

  const assignees = () => {
    const t = task();
    if (!t) return undefined;

    return t.assignees;
  };

  const meIsAssignee = () => {
    const me = identity()?.getPrincipal();
    if (!me) return false;

    const a = assignees();
    if (a === undefined) return true;

    return a.find((it) => it.compareTo(me) === "eq");
  };

  const interestingToMe = () => {
    return (
      meIsTaskCreator() ||
      meIsAssignee() ||
      (teamOnly() && meIsTeamMember()) ||
      (!teamOnly() && !meIsTeamMember())
    );
  };

  const stage = (): TTaskStatus => {
    const t = task();

    if (!t || !t.stage) return "Archived";

    if ("Edit" in t.stage) {
      return "Edit";
    }

    if ("Solve" in t.stage) {
      return "Solve";
    }

    if ("PreSolve" in t.stage) {
      return "PreSolve";
    }

    if ("Evaluate" in t.stage) {
      return "Evaluate";
    }

    return "Archived";
  };

  const stageLabel = () => {
    const t = task();

    const pClass =
      "font-primary font-normal text-md text-gray-150 flex gap-2 items-center justify-end";
    const spanClass = "font-bold text-black text-xl";
    const n = nowNs();

    return (
      <Switch fallback={<p class={pClass}>archived</p>}>
        <Match when={t && t.stage && "Edit" in t.stage}>
          <p class={pClass}>
            this <span class={spanClass}>draft</span> can still be edited by the
            creator
          </p>
        </Match>
        <Match when={t && t.stage && "PreSolve" in t.stage}>
          <p class={pClass}>
            this <span class={spanClass}>draft</span> is in post-edit review
          </p>
        </Match>
        <Match when={t && t.stage && "Solve" in t.stage}>
          <p class={pClass}>
            <span class={spanClass}>accepts</span> solutions for{" "}
            <Countdown
              timestampNs={n}
              durationNs={
                (t!.stage as { Solve: { until_timestamp: bigint } }).Solve
                  .until_timestamp - n
              }
              elapsedText="a little more"
            />
          </p>
        </Match>
        <Match when={t && t.stage && "Evaluate" in t.stage}>
          <p class={pClass}>
            awaits <span class={spanClass}>evaluation</span> from the team
          </p>
        </Match>
      </Switch>
    );
  };

  const statusIcon = () => {
    const s = stage();

    return (
      <Switch fallback={<Icon kind={EIconKind.DocInfo} color={COLORS.black} />}>
        <Match when={s === "Edit"}>
          <Icon kind={EIconKind.DocEdit} color={COLORS.gray[150]} />
        </Match>
        <Match when={s === "PreSolve"}>
          <Icon kind={EIconKind.DocQuestion} color={COLORS.gray[150]} />
        </Match>
        <Match when={s === "Solve"}>
          <Icon kind={EIconKind.DocQuestion} color={COLORS.green} />
        </Match>
        <Match when={s === "Evaluate"}>
          <Icon kind={EIconKind.DocSearch} color={COLORS.darkBlue} />
        </Match>
      </Switch>
    );
  };

  const solverKind = () => {
    const t = task();
    if (!t) return "Public";

    if (t.assignees && t.assignees.length > 0) return "Assigned";
    if (t.solver_constraints.find((it) => "TeamOnly" in it)) return "Team Only";

    return "Public";
  };

  return (
    <div
      class="flex flex-col self-stretch gap-5 shadow-md p-5 relative"
      classList={{
        "opacity-50": !interestingToMe(),
      }}
    >
      <Show when={taskMarker()}>
        <AttentionMarker />
      </Show>
      <div class="flex flex-col gap-2">
        <div class="flex flex-grow gap-1 items-center">
          <div class="flex flex-grow gap-1 items-baseline">
            <p class="font-primary font-medium text-xs text-gray-150">
              {props.id.toString()}
            </p>
            <h3 class="flex-grow font-primary font-medium text-2xl sm:text-4xl text-black">
              {task() ? task()!.title : "Loading..."}
            </h3>
            <div class="flex flex-col items-center py-2">{statusIcon()}</div>
          </div>
        </div>
        <div class="flex gap-2">
          <div class="flex py-2 px-4 gap-1 rounded-md font-primary font-bold text-xs bg-black text-white">
            {solverKind()}
          </div>
          <For each={task()?.decision_topics ? task()!.decision_topics : []}>
            {(topicId) => <DecisionTopic id={topicId} />}
          </For>
        </div>
      </div>
      <Show when={stage() !== "Archived"}>
        <div class="flex flex-col lg:flex-row gap-1 justify-between items-end lg:items-center">
          {stageLabel()}
          <div class="flex gap-1 lg:items-center">
            <E8sWidget
              kind={EE8sKind.Hour}
              minValue={task()?.hours_base ? task()!.hours_base! : E8s.zero()}
            />
            <E8sWidget
              kind={EE8sKind.Storypoint}
              minValue={
                task()?.storypoints_base
                  ? task()!.storypoints_base!
                  : E8s.zero()
              }
              maxValue={task()?.storypoints_ext_budget}
            />
          </div>
        </div>
      </Show>
    </div>
  );
}

export function Task(props: ITaskProps) {
  const { tasks, archivedTasks, fetchTasksById, attachToTask } = useTasks();
  const {
    identity,
    isAuthorized,
    isReadyToFetch,
    authorize,
    enable,
    disable,
    agent,
  } = useAuth();
  const {
    createTasksStartSolveVoting,
    createTasksEvaluateVoting,
    createTasksDeleteVoting,
    votings,
    fetchVotings,
  } = useVotings();
  const { meIsTeamMember } = useHumans();

  const [proof] = createResource(agent, getProfProof);
  const [showSolveModal, setShowSolveModal] = createSignal(false);
  const task = (): (Partial<ITask> & IArchivedTaskV1) | undefined =>
    tasks[props.id.toString()] || archivedTasks[props.id.toString()];

  createEffect(() => {
    if (!task() && isReadyToFetch()) fetchTasksById([props.id]);
  });

  const startSolveVotingId = (): VotingId => ({
    StartSolveTask: props.id,
  });

  const evaluateVotingId = (): VotingId => ({
    EvaluateTask: props.id,
  });

  const taskDeleteVotingId = (): VotingId => ({ DeleteTask: props.id });

  const taskDeleteVoting = () => votings[encodeVotingId(taskDeleteVotingId())];

  createEffect(
    on(isReadyToFetch, (ready) => {
      if (ready) {
        fetchVotings([taskDeleteVotingId()]);
      }
    })
  );

  const maxSolutions = () => {
    const t = task();

    if (!t) return 0;

    return (
      t.solver_constraints.find((it) => "MaxSolutions" in it)?.MaxSolutions ?? 0
    );
  };

  const stage = (): TTaskStatus => {
    const t = task();

    if (!t || !t.stage) return "Archived";

    if ("Edit" in t.stage) {
      return "Edit";
    }

    if ("PreSolve" in t.stage) {
      return "PreSolve";
    }

    if ("Solve" in t.stage) {
      return "Solve";
    }

    if ("Evaluate" in t.stage) {
      return "Evaluate";
    }

    return "Archived";
  };

  const stageLabel = () => {
    const t = task();

    const pClass =
      "font-primary font-normal text-md text-gray-150 text-right flex gap-2 items-center justify-end";
    const spanClass = "font-bold text-black text-xl";
    const n = nowNs();

    return (
      <Switch fallback={<p class={pClass}>archived</p>}>
        <Match when={t && t.stage && "Edit" in t.stage}>
          <p class={pClass}>
            this <span class={spanClass}>draft</span> can still be edited by the
            creator
          </p>
        </Match>
        <Match when={t && t.stage && "PreSolve" in t.stage}>
          <p class={pClass}>
            this <span class={spanClass}>draft</span> is in review
          </p>
        </Match>
        <Match when={t && t.stage && "Solve" in t.stage}>
          <p class={pClass}>
            <span class={spanClass}>accepts</span> solutions for{" "}
            <Countdown
              timestampNs={n}
              durationNs={
                (t!.stage as { Solve: { until_timestamp: bigint } }).Solve
                  .until_timestamp - n
              }
              elapsedText="a little more"
            />
          </p>
        </Match>
        <Match when={t && t.stage && "Evaluate" in t.stage}>
          <p class={pClass}>
            awaits <span class={spanClass}>evaluation</span> from the team
          </p>
        </Match>
      </Switch>
    );
  };

  const statusIcon = () => {
    const s = stage();

    return (
      <Switch fallback={<Icon kind={EIconKind.DocInfo} color={COLORS.black} />}>
        <Match when={s === "Edit"}>
          <Icon kind={EIconKind.DocEdit} color={COLORS.gray[150]} />
        </Match>
        <Match when={s === "PreSolve"}>
          <Icon kind={EIconKind.DocQuestion} color={COLORS.gray[150]} />
        </Match>
        <Match when={s === "Solve"}>
          <Icon kind={EIconKind.DocQuestion} color={COLORS.green} />
        </Match>
        <Match when={s === "Evaluate"}>
          <Icon kind={EIconKind.DocSearch} color={COLORS.darkBlue} />
        </Match>
      </Switch>
    );
  };

  const readyToEvaluate = () => {
    const t = task();

    if (!t || !t.stage || !("Solve" in t.stage)) return false;

    const now = nowNs();
    const till = t.stage.Solve.until_timestamp;

    return now >= till;
  };

  const handleFinishEditClick = async () => {
    const agreed = confirm(
      "Are you sure you want to transition this task to the Solving Phase? You won't be able to edit it anymore, unless it fails the review."
    );

    if (!agreed) return;

    disable();
    await createTasksStartSolveVoting(props.id);
    enable();

    await fetchTasksById([props.id]);
    logInfo("The voting has been created!");
  };

  const handleFinishSolveClick = async () => {
    const agreed = confirm(
      "Are you sure you want to transition this task to the Evaluation Phase? This will prevent new solutions to be submitted."
    );

    if (!agreed) return;

    disable();
    await createTasksEvaluateVoting(props.id);
    enable();

    await fetchTasksById([props.id]);
    logInfo("The voting has been created!");
  };

  const handleLogInClick = async () => {
    disable();
    await authorize();
    enable();
  };

  const handleSolveClick = () => {
    setShowSolveModal(true);
  };

  const handleRefresh = () => {
    fetchTasksById([props.id]);
  };

  const handleDeleteVoteClick = async () => {
    const agreed = confirm(
      `Are you sure you want to start a voting to delete the task #${props.id.toString()}?`
    );

    if (!agreed) return;

    disable();
    await createTasksDeleteVoting(props.id);
    await fetchVotings([taskDeleteVotingId()]);
    enable();

    logInfo("Voting created!");
  };

  const button = () => {
    return (
      <div class="flex gap-4 flex-grow flex-col sm:flex-row">
        <Switch>
          <Match when={canEdit()}>
            <div class="flex gap-4 items-center">
              <A
                href={`${ROOT.$.tasks.$.edit.path}?id=${props.id.toString()}`}
                class="font-primary font-light text-gray-150 underline text-sm"
              >
                Edit
              </A>
              <Btn text="Start Solving Phase" onClick={handleFinishEditClick} />
            </div>
          </Match>
          <Match when={stage() === "PreSolve"}>
            <VotingWidget
              kind="satisfaction"
              id={encodeVotingId(startSolveVotingId())}
              optionIdx={0}
              onRefreshEntity={handleRefresh}
            />
          </Match>
          <Match
            when={
              readyToEvaluate() &&
              meIsTeamMember() &&
              task()!.solutions.length > 0
            }
          >
            <Btn
              text="Start Evaluation Phase"
              onClick={handleFinishSolveClick}
            />
          </Match>
        </Switch>
        <Switch>
          <Match when={canSolve() && proof()}>
            <Btn
              text={mySolution() ? "Edit Solution" : "Solve"}
              icon={EIconKind.CheckRect}
              iconColor={COLORS.green}
              onClick={handleSolveClick}
            />
          </Match>
          <Match when={!isAuthorized()}>
            <Btn
              text="Log In to Contribute"
              icon={EIconKind.MetaMask}
              onClick={handleLogInClick}
            />
          </Match>
        </Switch>
        <Switch>
          <Match
            when={
              stage() !== "Archived" && meIsTeamMember() && !taskDeleteVoting()
            }
          >
            <Btn
              text="Delete Task"
              icon={EIconKind.CancelCircle}
              iconColor={COLORS.errorRed}
              onClick={handleDeleteVoteClick}
            />
          </Match>
          <Match
            when={
              stage() !== "Archived" && meIsTeamMember() && taskDeleteVoting()
            }
          >
            <VotingWidget
              id={encodeVotingId(taskDeleteVotingId())}
              kind="satisfaction"
              optionIdx={0}
            />
          </Match>
        </Switch>
      </div>
    );
  };

  const canSolve = () => {
    const t = task();
    const me = identity()?.getPrincipal();

    if (!me || !t || !t.stage) return false;
    if (!("Solve" in t.stage)) return false;
    if (
      t.assignees &&
      !t.assignees.map((it) => it.toText()).includes(me.toText())
    )
      return false;
    if (
      !!t.solver_constraints.find((it) => "TeamOnly" in it) &&
      !meIsTeamMember()
    )
      return false;
    if (
      t.solver_constraints.find((it) => "MaxSolutions" in it)?.MaxSolutions ===
      t.solutions.length
    )
      return false;

    return true;
  };

  const mySolution = () => {
    const t = task();

    if (!t || t.solutions.length == 0) return undefined;

    const me = identity()?.getPrincipal();

    if (!me) return undefined;

    return t.solutions.find(([solver, _]) => solver.compareTo(me) === "eq");
  };

  const canEdit = () => {
    const t = task();

    if (!t || !t.stage || !("Edit" in t.stage)) return false;

    const creator = t.creator;
    const me = identity()?.getPrincipal();

    if (!creator || !me) return false;

    return me.compareTo(creator) === "eq";
  };

  const countMeInValue = () => {
    const solvers = task()?.solvers;
    const me = identity()?.getPrincipal();

    if (!solvers || !me || !isAuthorized()) return false;

    const found = solvers.find((id) => id.compareTo(me) === "eq");

    return !!found;
  };

  const canAttach = () => {
    const t = task();
    const me = identity()?.getPrincipal();

    if (!t || !me) return false;
    if (t.assignees && !t.assignees.find((it) => it.compareTo(me) === "eq"))
      return false;
    if (
      t.solver_constraints.find((it) => "TeamOnly" in it) &&
      !meIsTeamMember()
    )
      return false;

    return true;
  };

  const handleCountMeIn = async () => {
    disable();
    await attachToTask(props.id);
    enable();

    fetchTasksById([props.id]);
  };

  const handleSolutionSubmit = async () => {
    setShowSolveModal(false);
    fetchTasksById([props.id]);
  };

  const solverKind = () => {
    const t = task();
    if (!t) return "Public";

    if (t.assignees && t.assignees.length > 0) return "Assigned";
    if (t.solver_constraints.find((it) => "TeamOnly" in it)) return "Team Only";

    return "Public";
  };

  return (
    <>
      <div class="flex flex-col self-stretch gap-5">
        <div class="flex flex-col gap-2">
          <div class="flex flex-grow gap-1 items-center">
            <div class="flex flex-grow gap-1 items-baseline">
              <p class="font-primary font-medium text-xs text-gray-150">
                {props.id.toString()}
              </p>
              <h3 class="flex-grow font-primary font-medium text-3xl sm:text-4xl text-black">
                {task() ? task()!.title : "Loading..."}
              </h3>
              <div class="flex flex-col items-center py-2">{statusIcon()}</div>
            </div>
          </div>
          <div class="flex gap-2">
            <div class="flex py-2 px-4 gap-1 rounded-md font-primary font-bold text-xs bg-black text-white">
              {solverKind()}
            </div>
            <For each={task()?.decision_topics ? task()!.decision_topics : []}>
              {(topicId) => <DecisionTopic id={topicId} />}
            </For>
          </div>
        </div>
        <div class="flex flex-col py-2">
          <MdPreview content={task() ? task()!.description : "Loading..."} />
        </div>
        <div class="flex flex-col gap-5">
          <div class="flex flex-col sm:flex-row flex-grow gap-5">
            <div class="flex flex-grow flex-col gap-1">
              <div class="flex items-center justify-between">
                <Title text="Created By" />
                <Title
                  text={task() ? timestampToStr(task()!.created_at) : "N/A"}
                />
              </div>
              <ProfileMini id={task()?.creator} />
            </div>
            <Switch>
              <Match
                when={
                  task() && task()!.assignees && task()!.assignees!.length > 0
                }
              >
                <div class="flex flex-grow flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <Title text="Predefined Assignees" />
                  </div>
                  <div class="flex flex-wrap gap-1 items-center">
                    <For each={task()!.assignees!}>
                      {(id) => <ProfileMini id={id} />}
                    </For>
                  </div>
                </div>
              </Match>
              <Match when={task() && !task()!.assignees && task()?.solvers}>
                <div class="flex flex-grow flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <Title text="Working On It" />
                  </div>
                  <div class="flex flex-wrap gap-1 items-center">
                    <For
                      fallback={
                        <p class="font-primary text-xs text-gray-140 italic">
                          Be the first one
                        </p>
                      }
                      each={task()?.solvers ? task()!.solvers! : []}
                    >
                      {(id) => <ProfileMicro id={id} />}
                    </For>
                  </div>
                  <Show when={canAttach()}>
                    <div class="flex flex-grow justify-end">
                      <BooleanInput
                        labelOn="Won't Do"
                        labelOff="Count Me It"
                        value={countMeInValue()}
                        onChange={handleCountMeIn}
                      />
                    </div>
                  </Show>
                </div>
              </Match>
            </Switch>
          </div>
          <div class="flex flex-grow gap-5 flex-col">
            <Show when={stage() !== "Archived"}>
              <div class="flex flex-grow flex-col gap-1">
                <Title text="Rewards" />
                <E8sWidget
                  kind={EE8sKind.Hour}
                  minValue={
                    task()?.hours_base ? task()!.hours_base! : E8s.zero()
                  }
                />
                <E8sWidget
                  kind={EE8sKind.Storypoint}
                  minValue={
                    task()?.storypoints_base
                      ? task()!.storypoints_base!
                      : E8s.zero()
                  }
                  maxValue={task()?.storypoints_ext_budget}
                />
              </div>
            </Show>
            <Show when={stage() === "PreSolve" || stage() === "Edit"}>
              <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                  <Title text="Days To Solve" />
                  <p>{task()!.days_to_solve!.toString()}</p>
                </div>
                <div class="flex flex-col gap-2">
                  <Title text="Max Solutions" />
                  <p>{maxSolutions()}</p>
                </div>
                <div class="flex flex-col gap-2">
                  <Title text="Solution Fields" />
                  <div class="flex flex-col gap-1 text-xs">
                    <div class="grid grid-cols-4 gap-2">
                      <p class="font-bold">Type</p>
                      <p class="font-bold">Name</p>
                      <p class="font-bold">Description</p>
                      <p class="font-bold">Is Required?</p>
                    </div>
                    <For each={task()!.solution_fields}>
                      {(field) => (
                        <div class="grid grid-cols-4 gap-2">
                          <p>{getSolutionFieldType(field)}</p>
                          <p>{field.name}</p>
                          <p>{field.description}</p>
                          <p>{field.required ? "required" : "optional"}</p>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </Show>
            <div class="flex flex-grow flex-col gap-1">
              {stageLabel()}
              {button()}
            </div>
          </div>
        </div>
        <Show when={task()?.solutions && task()!.solutions!.length > 0}>
          <div class="flex flex-col gap-5">
            <Title
              text={`Solutions (${task()!.solutions.length}/${maxSolutions()})`}
            />
            <For each={task()!.solutions!}>
              {([solver, it], idx) => (
                <TaskSolution
                  idx={idx()}
                  solution={it}
                  solver={solver}
                  fields={task()!.solution_fields}
                  votingId={
                    task()!.stage! && "Evaluate" in task()!.stage!
                      ? { EvaluateTask: props.id }
                      : undefined
                  }
                  stars={!!task()?.storypoints_ext_budget?.toBool()}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
      <Show when={showSolveModal() && task()?.solution_fields}>
        <Modal
          onClose={() => setShowSolveModal(false)}
          title={`Submit a solution for task #${props.id}`}
        >
          <SolutionSubmitForm
            onSubmit={handleSolutionSubmit}
            taskId={props.id}
            fields={task()!.solution_fields!}
          />
        </Modal>
      </Show>
    </>
  );
}
