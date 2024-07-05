import { BooleanInput } from "@components/boolean-input";
import { Btn } from "@components/btn";
import { daysLeft, nowNs } from "@components/countdown";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { EIconKind, Icon } from "@components/icon";
import { MdPreview } from "@components/md-preview";
import { ProfileMicro, ProfileMini } from "@components/profile/profile";
import { Title } from "@components/title";
import { useAuth } from "@store/auth";
import { IArchivedTaskV1, ITask, useTasks } from "@store/tasks";
import { useVotings } from "@store/votings";
import { COLORS } from "@utils/colors";
import { timestampToStr } from "@utils/encoding";
import { E8s } from "@utils/math";
import { TTaskId } from "@utils/types";
import { For, Match, Show, Switch, createSignal, onMount } from "solid-js";

export interface ITaskProps {
  id: TTaskId;
}

type TStatus = "Edit" | "Solve" | "Evaluate" | "Archived";

export function Task(props: ITaskProps) {
  const { tasks, fetchTasks, attachToTask } = useTasks();
  const { identity, isAuthorized, profileProof, authorize } = useAuth();
  const { createTasksFinishEditVoting, createTasksEvaluateVoting } =
    useVotings();

  const [disabled, setDisabled] = createSignal(false);

  const task = (): (Partial<ITask> & IArchivedTaskV1) | undefined =>
    tasks[props.id.toString()];

  const stage = (): TStatus => {
    const t = task();

    if (!t || !t.stage) return "Archived";

    if ("Edit" in t.stage) {
      return "Edit";
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

    const pClass = "font-primary font-normal text-md text-gray-150";
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
        <Match when={t && t.stage && "Solve" in t.stage}>
          <p class={pClass}>
            accepts solutions for{" "}
            <span class={spanClass}>
              {daysLeft(
                n,
                (t!.stage as { Solve: { until_timestamp: bigint } }).Solve
                  .until_timestamp - n,
                n
              ).toString()}
            </span>{" "}
            more days
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
      "Are you sure you want to transition this task to the Solving Phase? You won't be able to edit it anymore."
    );

    if (!agreed) return;

    setDisabled(true);
    await createTasksFinishEditVoting(props.id);
    setDisabled(false);

    alert(
      "The voting has been created! Navigate to the Decisions page to continue."
    );
  };

  const handleFinishSolveClick = async () => {
    const agreed = confirm(
      "Are you sure you want to transition this task to the Evaluation Phase? This will prevent new solutions to be submitted."
    );

    if (!agreed) return;

    setDisabled(true);
    await createTasksEvaluateVoting(props.id);
    setDisabled(false);

    alert(
      "The voting has been created! Navigate to the Decisions page to continue."
    );
  };

  const handleLogInClick = async () => {
    setDisabled(true);
    await authorize();
    setDisabled(false);
  };

  const button = () => {
    return (
      <Switch>
        <Match when={canEdit()}>
          <Btn
            text="Start Solving Phase"
            disabled={disabled()}
            onClick={handleFinishEditClick}
          />
        </Match>
        <Match when={readyToEvaluate()}>
          <Btn
            text="Start Evaluation Phase"
            disabled={disabled()}
            onClick={handleFinishSolveClick}
          />
        </Match>
        <Match when={canSolve() && profileProof()}>
          <Btn
            text="Solve"
            icon={EIconKind.CheckRect}
            iconColor={COLORS.green}
            disabled={disabled()}
          />
        </Match>
        <Match when={canSolve() && !profileProof()}>
          <Btn
            text="Log In to Contribute"
            icon={EIconKind.MetaMask}
            disabled={disabled()}
            onClick={handleLogInClick}
          />
        </Match>
      </Switch>
    );
  };

  const canSolve = () => {
    const t = task();

    if (!t || !t.stage || !("Solve" in t.stage)) return false;
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

  const handleCountMeIn = async () => {
    setDisabled(true);
    await attachToTask(props.id);
    setDisabled(false);

    fetchTasks([props.id]);
  };

  onMount(() => {
    if (!task()) fetchTasks([props.id]);
  });

  return (
    <div class="flex flex-col gap-5">
      <div class="flex flex-grow gap-1 items-center">
        <div class="flex flex-grow gap-1 items-baseline">
          <p class="font-primary font-medium text-xs text-gray-150">
            {props.id.toString()}
          </p>
          <h3 class="flex-grow font-primary font-medium text-4xl text-black">
            {task() ? task()!.title : "Loading..."}
          </h3>
          <div class="flex flex-col items-center py-2">
            {statusIcon()}
            <Show when={canEdit()}>
              <Icon kind={EIconKind.Edit} color={COLORS.gray[150]} />
            </Show>
          </div>
        </div>
      </div>
      <div class="flex flex-col py-2">
        <MdPreview content={task() ? task()!.description : "Loading..."} />
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex flex-grow gap-5">
          <div class="flex flex-grow flex-col gap-1">
            <div class="flex items-center justify-between">
              <Title text="Created By" />
              <Title
                text={task() ? timestampToStr(task()!.created_at) : "N/A"}
              />
            </div>
            <ProfileMini id={task()?.creator} />
          </div>
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
            <div class="flex flex-grow justify-end">
              <BooleanInput
                labels={["Won't Do", "Count Me It"]}
                defaultValue={countMeInValue()}
                disabled={disabled()}
                onChange={handleCountMeIn}
              />
            </div>
          </div>
        </div>
        <div class="flex flex-grow gap-2">
          <div class="flex flex-grow flex-col gap-1">
            <Title text="Rewards" />
            <E8sWidget
              kind={EE8sKind.Hours}
              minValue={task()?.hours_base ? task()!.hours_base! : E8s.zero()}
            />
            <E8sWidget
              kind={EE8sKind.Storypoints}
              minValue={
                task()?.storypoints_base
                  ? task()!.storypoints_base!
                  : E8s.zero()
              }
              maxValue={task()?.storypoints_ext_budget}
            />
          </div>
          <div class="flex flex-grow flex-col gap-1 justify-end items-end">
            {stageLabel()}
            {button()}
          </div>
        </div>
      </div>
    </div>
  );
}
