import { For, Match, Show, Switch, createSignal, onMount } from "solid-js";
import { SolidMarkdown } from "solid-markdown";
import {
  ITask,
  externalTaskDetails,
  internalTaskDetails,
  taskKind,
} from "../../data/entities/task";
import { Chip, ChipSkeleton } from "../chip";
import { useTasks } from "../../store/tasks";
import remarkGFM from "remark-gfm";
import { useHumans } from "../../store/humans";
import { Profile } from "../profile/profile";
import { timestampToStr, tokensToStr } from "../../utils/encoding";
import { CommentSkeleton, Comment } from "../comment";

export interface ITaskProps {
  task: ITask;
}

export function Task(props: ITaskProps) {
  const { taskTags, fetchTaskTags, taskComments, fetchTaskComments } =
    useTasks();
  const { profiles, fetchProfiles } = useHumans();

  const [commentsVisible, setCommentsVisible] = createSignal(false);

  const taskTagIds = () => Object.keys(taskTags);
  const commentIds = () => Object.keys(taskComments);

  onMount(() => {
    fetchTaskTags(props.task.tagIds);

    const internalDetails = internalTaskDetails(props.task);

    if (internalDetails && internalDetails.assignee) {
      fetchProfiles([internalDetails.assignee]);
    }
  });

  const handleFetchCommentsClick = () => {
    setCommentsVisible(true);
    fetchTaskComments(props.task.comments);
  };

  return (
    <div class="w-full rounded-md bg-white shadow-md p-3 flex flex-col gap-3">
      <div class="flex flex-row items-baseline gap-2">
        <p class="font-sans font-thin text-gray-500 text-sm">
          {taskKind(props.task)}
        </p>
        <h4 class="font-sans font-medium text-3xl">{props.task.title}</h4>
      </div>
      <div class="flex flex-row gap-1">
        <Show when={taskTagIds().length > 0} fallback={<ChipSkeleton />}>
          <For each={taskTagIds()}>
            {(tagId) => (
              <Chip
                text={taskTags[tagId].name}
                bgColor={taskTags[tagId].color}
              />
            )}
          </For>
        </Show>
      </div>
      <div>
        <div class="flex flex-row gap-6 h-20">
          <div>
            <p class="font-semibold">Status</p>
            <p class="h-12 flex items-center">{props.task.status}</p>
          </div>
          <Switch>
            <Match when={taskKind(props.task) === "Internal"}>
              <div>
                <p class="font-semibold">Utility</p>
                <p class="h-12 flex items-center">
                  {tokensToStr(props.task.utilityStorypoints, 8)} STORYPOINTS
                </p>
              </div>
              <div>
                <p class="font-semibold">Time estimate</p>
                <p class="h-12 flex items-center">
                  <Show
                    when={internalTaskDetails(props.task)!.hoursToProcess}
                    fallback={"N/A"}
                  >
                    {tokensToStr(
                      internalTaskDetails(props.task)!.hoursToProcess!,
                      8
                    )}{" "}
                    HOURS
                  </Show>
                </p>
              </div>
              <div>
                <p class="font-semibold">Assignee</p>
                <Show
                  when={internalTaskDetails(props.task)!.assignee}
                  fallback={"None"}
                >
                  <Show
                    when={
                      profiles[
                        internalTaskDetails(props.task)!.assignee.toText()
                      ]
                    }
                    fallback={"Loading..."}
                  >
                    <Profile
                      profile={
                        profiles[
                          internalTaskDetails(props.task)!.assignee.toText()
                        ]
                      }
                    />
                  </Show>
                </Show>
              </div>
            </Match>
            <Match when={taskKind(props.task) === "External"}>
              <div>
                <p class="font-semibold">Assignee</p>
                <p class="h-12 flex items-center">Anyone</p>
              </div>
              <div>
                <p class="font-semibold">Reward for each approved resolution</p>
                <p class="h-12 flex items-center">
                  {tokensToStr(props.task.utilityStorypoints, 8)} STORYPOINTS
                </p>
              </div>
              <div>
                <p class="font-semibold">Starts at</p>
                <p class="h-12 flex items-center">
                  {timestampToStr(
                    externalTaskDetails(props.task).inProgressStart
                  )}
                </p>
              </div>
              <div>
                <p class="font-semibold">Ends at</p>
                <p class="h-12 flex items-center">
                  {timestampToStr(
                    externalTaskDetails(props.task).inProgressEnd
                  )}
                </p>
              </div>
            </Match>
          </Switch>
        </div>
      </div>
      <SolidMarkdown
        class="md-content"
        remarkPlugins={[remarkGFM]}
        children={props.task.description}
      />
      <div class="flex flex-col gap-2">
        <Show
          when={commentsVisible()}
          fallback={
            <p
              class="text-blue-500 cursor-pointer"
              onClick={handleFetchCommentsClick}
            >
              Show comments...
            </p>
          }
        >
          <h4 class="font-sans font-bold text-xl">Comments & Resolutions</h4>
          <div class="p-3">
            <Show when={commentIds().length > 0} fallback={<CommentSkeleton />}>
              <For each={commentIds()}>
                {(commentId) => <Comment comment={taskComments[commentId]} />}
              </For>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
