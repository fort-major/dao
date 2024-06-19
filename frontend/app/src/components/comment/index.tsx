import { Show, onMount } from "solid-js";
import { IComment } from "../../data/entities/comment";
import { useHumans } from "../../store/humans";
import { ProfileMini, ProfileSkeleton } from "../profile/profile";
import { timestampToStr } from "../../utils/encoding";
import { SolidMarkdown } from "solid-markdown";
import { Chip } from "../chip";
import remarkGfm from "remark-gfm";

export interface ICommentProps {
  comment: IComment;
}

export function Comment(props: ICommentProps) {
  const { profiles, fetchProfiles } = useHumans();

  const getProfile = () => profiles[props.comment.sender.toText()];

  onMount(() => {
    fetchProfiles([props.comment.sender]);
  });

  return (
    <div class="w-full flex flex-col gap-1">
      <div class="flex flex-row justify-between gap-2 items-center">
        <Show when={getProfile()} fallback={<ProfileSkeleton />}>
          <ProfileMini profile={getProfile()!} />
        </Show>
        <div class="flex flex-col justify-end gap-1">
          <p class="text-gray-500 font-thin text-xs">
            {timestampToStr(props.comment.timestamp)}
          </p>
          <Show when={props.comment.isResolution}>
            <Chip text="Resolution" bgColor="#197e2a" />
          </Show>
        </div>
      </div>
      <SolidMarkdown
        class="md-content"
        remarkPlugins={[remarkGfm]}
        disallowedElements={["#", "##", "###", "####", "#####", "######"]}
      >
        {props.comment.content}
      </SolidMarkdown>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div class="w-full flex flex-col gap-2 border rounded-md">
      <div class="flex flex-row justify-between gap-2 items-center">
        <ProfileSkeleton />
        <p class="text-gray-500 font-thin text-xs">N/A</p>
      </div>
      <SolidMarkdown
        class="md-content"
        remarkPlugins={[remarkGfm]}
        disallowedElements={["#", "##", "###", "####", "#####", "######"]}
      >
        Loading...
      </SolidMarkdown>
    </div>
  );
}
