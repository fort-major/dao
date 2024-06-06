import { Show } from "solid-js";
import { IProfile } from "../../data/entities/profile";
import { IClass } from "../../utils/types";
import { Avatar, AvatarSkeleton } from "../avatar";
import { Principal } from "@dfinity/principal";

export interface IProfileProps extends IClass {
  profile: IProfile;
}

export function Profile(props: IProfileProps) {
  return (
    <div class="flex flex-row items-center gap-2">
      <Show when={props.profile.avatarUrl} fallback={<AvatarSkeleton />}>
        <Avatar url={props.profile.avatarUrl!} />
      </Show>
      <div class="flex flex-col">
        <p class="font-sans text-md">
          <Show when={props.profile.name} fallback={"Anonymous"}>
            {props.profile.name!}
          </Show>
        </p>
        <p class="font-sans text-sm text-gray-300 text-ellipsis">
          {props.profile.id.toText()}
        </p>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div class="flex flex-row items-center gap-2 w-36">
      <AvatarSkeleton />
      <div class="flex flex-col">
        <p class="font-sans text-md">Anonymous</p>
        <p class="font-sans text-sm text-gray-300 text-ellipsis">
          {Principal.anonymous().toHex()}
        </p>
      </div>
    </div>
  );
}
