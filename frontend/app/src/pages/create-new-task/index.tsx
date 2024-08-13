import { Backlink } from "@components/backlink";
import { CreateTaskForm } from "@components/create-task-form";
import { Page } from "@components/page";
import { Title } from "@components/title";
import { useLocation, useNavigate } from "@solidjs/router";
import { useHumans } from "@store/humans";
import { createMemo, onMount } from "solid-js";

export function CreateUpdateTaskPage() {
  const { query } = useLocation();

  const id = createMemo(() => (query["id"] ? BigInt(query["id"]) : undefined));

  return (
    <Page class="pt-10 pb-20" slim>
      <Backlink />
      <div class="flex flex-col gap-20 max-w-5xl w-full">
        <Title
          text={id() ? `Edit Task ${id()!.toString()}` : "Create New Task"}
        />
        <CreateTaskForm id={id()} />
      </div>
    </Page>
  );
}
