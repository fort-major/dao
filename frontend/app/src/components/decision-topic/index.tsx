import { DecisionTopicId } from "@store/tasks";
import { useVotings } from "@store/votings";
import { createEffect, onMount } from "solid-js";

export interface IDecisionTopicProps {
  id: DecisionTopicId;
  onSelect?: () => void;
  selected?: boolean;
}

const PALETTE = [
  "#9e0142",
  "#d53e4f",
  "#f46d43",
  "#fdae61",
  "#fee08b",
  "#e6f598",
  "#abdda4",
  "#66c2a5",
  "#3288bd",
  "#5e4fa2",
];

export function DecisionTopic(props: IDecisionTopicProps) {
  const { decisionTopics } = useVotings();

  const topic = () => decisionTopics[props.id];

  return (
    <div
      class="flex py-2 px-4 gap-1 rounded-md font-primary font-bold text-xs"
      style={{ "background-color": PALETTE[props.id % PALETTE.length] }}
      classList={{
        "cursor-pointer": !!props.onSelect,
        "opacity-50": !!props.onSelect && !props.selected,
      }}
      onClick={props.onSelect}
    >
      {topic()?.name ? topic()!.name : "Loading..."}
    </div>
  );
}
