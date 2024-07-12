import { ROOT } from "@/routes";
import { Backlink } from "@components/backlink";
import { EIconKind, Icon } from "@components/icon";
import { Page } from "@components/page";
import { Task } from "@components/task";
import { A, useLocation, useNavigate } from "@solidjs/router";
import { COLORS } from "@utils/colors";
import { createEffect, Show } from "solid-js";

export function TaskPage() {
  const { query } = useLocation();

  const id = () => (query["id"] ? BigInt(query["id"]) : undefined);

  return (
    <Page slim>
      <Backlink />
      <Show when={id() !== undefined} fallback={"Loading..."}>
        <Task id={id()!} />
      </Show>
    </Page>
  );
}
