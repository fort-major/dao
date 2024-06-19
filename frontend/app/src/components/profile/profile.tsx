import { Show } from "solid-js";
import { IClass } from "../../utils/types";
import { Avatar, AvatarSkeleton } from "../avatar";
import { Principal } from "@dfinity/principal";
import { Profile } from "../../declarations/humans/humans.did";
import { IProfile } from "../../store/humans";

export interface IProfileProps extends IClass {
  profile: IProfile;
}

export function ProfileMini(props: IProfileProps) {
  return (
    <div class="flex flex-row items-center gap-2">
      <Avatar url={props.profile.avatar_src} />
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
