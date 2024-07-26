import { Page } from "@components/page";
import { ProfileFull } from "@components/profile/profile";
import { Title } from "@components/title";
import { Principal } from "@dfinity/principal";
import { useAuth } from "@store/auth";
import { useHumans } from "@store/humans";
import { createEffect, createMemo, For } from "solid-js";

export function HumansPage() {
  const { totals, profileIds, fetchProfileIds } = useHumans();
  const { isReadyToFetch } = useAuth();

  const teamMemberIds = () => totals().teamMembers;
  const ids = createMemo(() =>
    Object.keys(profileIds)
      .map((it) => Principal.fromText(it))
      .filter((it) => !teamMemberIds().find((id) => id.compareTo(it) === "eq"))
  );

  createEffect(() => {
    if (ids().length === 0 && isReadyToFetch()) {
      fetchProfileIds();
    }
  });

  return (
    <Page class="pt-10 pb-20">
      <div class="flex flex-col gap-10">
        <Title text="Team Members" />
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-4">
          <For fallback={"No such humans founds"} each={teamMemberIds()}>
            {(id) => <ProfileFull id={id} />}
          </For>
        </div>
        <Title text="Contributors" />
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-4">
          <For fallback={"No such humans founds"} each={ids()}>
            {(id) => <ProfileFull id={id} />}
          </For>
        </div>
      </div>
    </Page>
  );
}
