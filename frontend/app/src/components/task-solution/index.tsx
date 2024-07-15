import { SolutionField } from "@/declarations/tasks/tasks.did";
import { VotingId } from "@/declarations/votings/votings.did";
import { MdPreview } from "@components/md-preview";
import { ProfileMini } from "@components/profile/profile";
import { Title } from "@components/title";
import { VotingWidget } from "@components/voting-widget";
import { Principal } from "@dfinity/principal";
import { ISolution, TTaskStatus } from "@store/tasks";
import { encodeVotingId, timestampToStr } from "@utils/encoding";
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
    <div class="flex flex-col gap-5 p-4 shadow-md">
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
      </div>
      <Show when={props.votingId}>
        <VotingWidget
          id={encodeVotingId(props.votingId!)}
          optionIdx={props.idx}
          kind="satisfaction"
        />
      </Show>
    </div>
  );
}
