import { BooleanInput } from "@components/boolean-input";
import { DecisionTopic } from "@components/decision-topic";
import { useVotings } from "@store/votings";
import { useWorkReports } from "@store/work-reports";
import { createEffect, createSignal, For } from "solid-js";

export interface IWorkReportFilter {
  onRefetchNeeded: () => void;
}

export const WorkReportFilter = (props: IWorkReportFilter) => {
  const { filter, updateFilter, fetchFiltered } = useWorkReports();
  const { decisionTopics } = useVotings();

  const topicIds = () => Object.keys(decisionTopics).map((it) => parseInt(it));

  const handleArchiveToggle = (v: boolean) => {
    updateFilter({
      archived: v,
      myDrafts: false,
      decision_topic_id: filter().decision_topic_id,
    });

    props.onRefetchNeeded();
  };

  const handleMyDraftsToggle = (v: boolean) => {
    updateFilter({
      archived: false,
      myDrafts: v,
      decision_topic_id: [],
    });

    props.onRefetchNeeded();
  };

  const handleDecisionTopicClick = (id: number) => {
    if (id === filter().decision_topic_id[0]) {
      updateFilter({
        archived: filter().archived,
        myDrafts: filter().myDrafts,
        decision_topic_id: [],
      });
    } else {
      updateFilter({
        archived: filter().archived,
        myDrafts: filter().myDrafts,
        decision_topic_id: [id],
      });
    }

    props.onRefetchNeeded();
  };

  return (
    <div class="flex flex-col gap-2">
      <h5 class="font-semibold text-md">Filter contributions</h5>

      <div class="flex flex-col items-start">
        <BooleanInput
          labelOn="Archive"
          labelOff="Archive"
          onChange={handleArchiveToggle}
          value={filter().archived}
        />
        <BooleanInput
          labelOn="My Drafts"
          labelOff="My Drafts"
          onChange={handleMyDraftsToggle}
          value={filter().myDrafts}
        />
        <div class="flex flex-row gap-1">
          <For each={topicIds()}>
            {(topicId) => (
              <DecisionTopic
                id={topicId}
                selected={
                  filter().decision_topic_id.length == 1 &&
                  filter().decision_topic_id[0] === topicId
                }
                onSelect={() => handleDecisionTopicClick(topicId)}
              />
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
