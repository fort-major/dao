import { SolutionField } from "@/declarations/tasks/tasks.did";
import { VotingId } from "@/declarations/votings/votings.did";
import { E8sWidget, EE8sKind } from "@components/e8s-widget";
import { EIconKind, Icon } from "@components/icon";
import { MdPreview } from "@components/md-preview";
import { ProfileMini } from "@components/profile/profile";
import { Title } from "@components/title";
import { VotingWidget } from "@components/voting-widget";
import { Principal } from "@dfinity/principal";
import { ISolution, TTaskStatus } from "@store/tasks";
import { COLORS } from "@utils/colors";
import { encodeVotingId, timestampToStr } from "@utils/encoding";
import { E8s } from "@utils/math";
import { For, Match, Show, Switch } from "solid-js";

export interface ITaskSolutionProps {
  idx: number;
  solver: Principal;
  solution: ISolution;
  fields: SolutionField[];
  votingId?: VotingId;
}

export function TaskSolution(props: ITaskSolutionProps) {
  const isLink = (idx: number) => {
    const k = props.fields[idx].kind;

    return "Url" in k;
  };

  return (
    <div
      class="flex flex-col gap-5 p-4 shadow-md"
      classList={{ "opacity-50": props.solution.rejected }}
    >
      <div class="flex gap-5 justify-between">
        <ProfileMini id={props.solver} />
        <Title text={timestampToStr(props.solution.attached_at)} />
      </div>
      <div class="flex flex-col gap-2">
        <For each={props.solution.fields}>
          {(val, idx) => (
            <div class="flex flex-col gap-1">
              <Title text={props.fields[idx()].name} />

              <Show fallback={<MdPreview content={val} />} when={isLink(idx())}>
                <a class="text-darkBlue" href={val} target="_blank">
                  {val}
                </a>
              </Show>
            </div>
          )}
        </For>
        <Show
          when={
            props.solution.want_rep &&
            !props.solution.evaluation &&
            !props.solution.rejected
          }
        >
          <p class="italic text-xs text-right text-gray-165">
            Reputation requested
          </p>
        </Show>
      </div>

      <Show when={props.solution.evaluation}>
        <div class="flex gap-2 justify-between items-center">
          <div class="flex items-center gap-1">
            <p>
              {props.solution
                .evaluation!.mul(E8s.fromBigIntBase(5n))
                .toPrecision(2, true)}
            </p>
            <Icon kind={EIconKind.StarFilled} color={COLORS.yellow} />
          </div>
          <div class="flex items-center gap-2">
            <E8sWidget
              minValue={props.solution.reward_hours!}
              kind={EE8sKind.Hour}
            />
            <E8sWidget
              minValue={props.solution.reward_storypoints!}
              kind={EE8sKind.Storypoint}
            />
            <Show when={props.solution.want_rep}>
              <E8sWidget
                minValue={props.solution.reward_storypoints!.add(
                  props.solution.reward_hours!
                )}
                kind={EE8sKind.Reputation}
              />
            </Show>
          </div>
        </div>
      </Show>
      <Show when={props.votingId}>
        <VotingWidget
          id={encodeVotingId(props.votingId!)}
          optionIdx={props.idx}
          kind="evaluation"
        />
      </Show>
    </div>
  );
}
