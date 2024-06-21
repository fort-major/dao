import { For, Show, createEffect } from "solid-js";
import { useAuth } from "../../store/auth";
import { useHumans } from "../../store/humans";
import { IArchivedTaskV1, ITask } from "../../store/tasks";
import { Md } from "../md";
import { timestampToStr } from "../../utils/encoding";
import { ProfileMini } from "../profile/profile";
import { Solution } from "../solution";

export interface ITaskProps {
  task?: Partial<ITask> & IArchivedTaskV1;
}

export function Task(props: ITaskProps) {
  if (!props.task) return <TaskSkeleton />;

  const { isReadyToFetch } = useAuth();
  const { profiles, fetchProfiles } = useHumans();

  const creator = () => profiles[props.task!.creator.toText()];
  const solverCandidates = () =>
    (props.task!.solvers || []).map((id) => profiles[id.toText()]);
  const solvers = () =>
    props.task!.solutions.map(([solver, _]) => profiles[solver.toText()]);

  const stage = () =>
    props.task!.stage ? Object.keys(props.task!.stage)[0] : "Archive";

  const teamOnly = () =>
    !!props.task?.solver_constraints.find((it) => "TeamOnly" in it);

  createEffect(() => {
    if (!isReadyToFetch()) return;

    if (
      !creator() ||
      solverCandidates().some((it) => !it) ||
      solvers().some((it) => !it)
    ) {
      fetchProfiles([
        ...(props.task!.solvers || []),
        ...props.task!.solutions.map(([solver, _]) => solver),
        props.task!.creator,
      ]);
    }
  });

  return (
    <div>
      <h4>{props.task.title}</h4>
      <Show when={teamOnly()}>
        <p>This task can only be solved by a member of the team</p>
      </Show>
      <p>{stage()}</p>
      <Md content={props.task.description} />
      <p>{timestampToStr(props.task.created_at)}</p>
      <ProfileMini profile={creator()} />
      <Show when={stage() === "Edit"}>
        <p>{props.task.days_to_solve!.toString()} days to solve</p>
      </Show>
      <Show
        when={
          props.task.hours_base?.toBool() ||
          props.task.storypoints_base?.toBool() ||
          props.task.storypoints_ext_budget?.toBool()
        }
      >
        <p>Rewards</p>
        <Show when={props.task.hours_base?.toBool()}>
          <p>
            {props.task.hours_base!.toString()} hours (for each approved
            solution)
          </p>
        </Show>
        <Show when={props.task.storypoints_base?.toBool()}>
          <p>
            {props.task.storypoints_base!.toString()} storypoints (for each
            approved solution)
          </p>
        </Show>
        <Show when={props.task.storypoints_ext_budget?.toBool()}>
          <p>
            share in {props.task.storypoints_ext_budget!.toString()} storypoints
            pool (depending on the evaluation)
          </p>
        </Show>
      </Show>
      <div>
        <h5>Working on it:</h5>
        <For each={solverCandidates()}>
          {(it) => <ProfileMini profile={it} />}
        </For>
        <button>Count me in!</button>
      </div>

      <Show when={props.task.solutions.length > 0}>
        <div>
          <h5>Solutions</h5>
          <For each={props.task.solutions}>
            {([solver, solution]) => (
              <div>
                <ProfileMini profile={profiles[solver.toText()]} />
                <Solution
                  solution={solution}
                  solver={solver}
                  fields={props.task!.solution_fields}
                />
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export function TaskSkeleton() {
  return <div>Loading...</div>;
}
