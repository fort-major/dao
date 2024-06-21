import { Principal } from "@dfinity/principal";
import { SolutionField } from "../../declarations/tasks/tasks.did";
import { ISolution } from "../../store/tasks";
import { useHumans } from "../../store/humans";
import { useAuth } from "../../store/auth";
import { For, Show, createEffect } from "solid-js";
import { ProfileMini } from "../profile/profile";
import { timestampToStr } from "../../utils/encoding";
import { E8s } from "../../utils/math";

export interface ISolutionProps {
  solution: ISolution;
  fields: SolutionField[];
  solver: Principal;
}

export function Solution(props: ISolutionProps) {
  const { profiles, fetchProfiles } = useHumans();
  const { isReadyToFetch } = useAuth();

  const solver = () => profiles[props.solver.toText()];

  createEffect(() => {
    if (!solver() && isReadyToFetch()) {
      fetchProfiles([props.solver]);
    }
  });

  return (
    <div>
      <ProfileMini profile={solver()} />
      <p>{timestampToStr(props.solution.attached_at)}</p>
      <div>
        <For each={props.fields}>
          {(field, idx) => {
            const f = props.solution.fields[idx()] ?? "not provided";

            return (
              <>
                <p>{field.name}</p>
                <p>{field.description}</p>
                <p>{f}</p>
              </>
            );
          }}
        </For>
      </div>
      <Show when={!props.solution.rejected} fallback={<p>Rejected</p>}>
        <Show when={props.solution.evaluation}>
          <p>Approved</p>
          <p>
            {props.solution.evaluation!.mul(E8s.fromNumber(5n)).toPrecision(2)}{" "}
            stars
          </p>
        </Show>
        <Show
          when={
            props.solution.reward_hours || props.solution.reward_storypoints
          }
        >
          <p>Rewards</p>
          <Show when={props.solution.reward_hours}>
            <p>{props.solution.reward_hours!.toString()} hours</p>
          </Show>
          <Show when={props.solution.reward_storypoints}>
            <p>{props.solution.reward_storypoints!.toString()} storypoints</p>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
