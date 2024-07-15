import { ROOT } from "@/routes";
import { A, useLocation } from "@solidjs/router";
import { TTaskStatus } from "@store/tasks";
import { createEffect } from "solid-js";

export interface ITasksPageTabs {
  class?: string;
  onTabChange: (newTab: TTaskStatus) => void;
}

export function TasksPageTabs(props: ITasksPageTabs) {
  const { query } = useLocation();

  const curTab = () => (query["tab"] ?? "Solve") as TTaskStatus;

  createEffect(() => props.onTabChange(curTab()));

  return (
    <nav class="flex gap-5 p-5 items-center justify-center">
      <A
        href={`${ROOT.$.tasks.path}?tab=Solve`}
        class="font-primary text-gray-150 font-bold text-lg"
        classList={{ underline: curTab() === "Solve" }}
      >
        {tabText("Solve")}
      </A>
      <A
        href={`${ROOT.$.tasks.path}?tab=Evaluate`}
        class="font-primary text-gray-150 font-bold text-lg"
        classList={{ underline: curTab() === "Evaluate" }}
      >
        {tabText("Evaluate")}
      </A>
      <A
        href={`${ROOT.$.tasks.path}?tab=PreSolve`}
        class="font-primary text-gray-150 font-bold text-lg"
        classList={{ underline: curTab() === "PreSolve" }}
      >
        {tabText("PreSolve")}
      </A>
      <A
        href={`${ROOT.$.tasks.path}?tab=Edit`}
        class="font-primary text-gray-150 font-bold text-lg"
        classList={{ underline: curTab() === "Edit" }}
      >
        {tabText("Edit")}
      </A>
      <A
        href={`${ROOT.$.tasks.path}?tab=Archived`}
        class="font-primary text-gray-150 font-bold text-lg"
        classList={{ underline: curTab() === "Archived" }}
      >
        {tabText("Archived")}
      </A>
    </nav>
  );
}

const tabText = (status: TTaskStatus) => {
  switch (status) {
    case "Edit":
      return "Drafts";
    case "PreSolve":
      return "Draft Review";
    case "Solve":
      return "In-Progress";
    case "Evaluate":
      return "Evaluation";
    case "Archived":
      return "Archive";
  }
};
