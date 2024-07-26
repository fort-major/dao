import { Backlink } from "@components/backlink";
import { Page } from "@components/page";
import { Task } from "@components/task";
import { useLocation } from "@solidjs/router";
import { Show } from "solid-js";

export function TaskPage() {
  const { query } = useLocation();

  const id = () => (query["id"] ? BigInt(query["id"]) : undefined);

  return (
    <Page slim class="pt-10 pb-20">
      <Backlink class="mt-10" />
      <Show when={id() !== undefined} fallback={"Loading..."}>
        <Task id={id()!} />
      </Show>
    </Page>
  );
}
