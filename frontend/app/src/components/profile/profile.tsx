import { Show } from "solid-js";
import { IClass } from "../../utils/types";
import { Avatar, AvatarSkeleton } from "../avatar";
import { Principal } from "@dfinity/principal";
import { IProfile, useHumans } from "../../store/humans";
import { COLORS } from "@utils/colors";

export interface IProfileProps extends IClass {
  id: Principal;
}

export function ProfileMini(props: IProfileProps) {
  const { profiles } = useHumans();

  const profile = () => profiles[props.id.toText()];

  return (
    <div class="flex flex-row items-center gap-2">
      <Show when={profile()?.avatar_src} fallback={<AvatarSkeleton />}>
        <Avatar
          borderColor={
            profile()?.employment ? COLORS.darkBlue : COLORS.gray[150]
          }
          url={profile()!.avatar_src}
        />
      </Show>
      <div class="flex flex-col gap-1">
        <p class="font-primary text-xs font-bold">
          <Show when={profile()?.name} fallback={"Anonymous"}>
            {profile()!.name!}
          </Show>
        </p>
        <p class="font-primary font-normal text-xs text-gray-150 text-ellipsis">
          <Show when={profile()?.id} fallback={Principal.anonymous().toText()}>
            {profile()!.id.toText()}
          </Show>
        </p>
      </div>
    </div>
  );
}
