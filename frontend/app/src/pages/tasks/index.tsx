import { ROOT } from "@/routes";
import { Btn } from "@components/btn";
import { EIconKind } from "@components/icon";
import { Page } from "@components/page";
import { TaskMini } from "@components/task";
import { TasksPageTabs } from "@components/tasks-page-tabs";
import { Title } from "@components/title";
import { A, useNavigate } from "@solidjs/router";
import { useAuth } from "@store/auth";
import { useHumans } from "@store/humans";
import { taskStageToOrd, TTaskStatus, useTasks } from "@store/tasks";
import { COLORS } from "@utils/colors";
import {
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

export function TasksPage() {
  const {
    editTaskIds,
    preSolveTaskIds,
    solveTaskIds,
    evaluateTaskIds,
    fetchTaskIds,
    archivedTaskIds,
    fetchArchivedTaskIds,
  } = useTasks();
  const { isReadyToFetch, isAuthorized, identity } = useAuth();
  const { profiles } = useHumans();

  const [tab, setTab] = createSignal<TTaskStatus>("Solve");
  const [canFetchMore, setCanFetchMore] = createSignal(true);
  const [fetching, setFetching] = createSignal(false);

  createEffect(
    on(isReadyToFetch, (r) => {
      if (r) {
        handleFetch();
      }
    })
  );

  createEffect(
    on(tab, () => {
      if (isReadyToFetch()) {
        handleFetch();
      }
    })
  );

  createEffect(
    on(tab, () => {
      setCanFetchMore(true);
    })
  );

  const ids = () => {
    switch (tab()) {
      case "Edit":
        return editTaskIds;
      case "PreSolve":
        return preSolveTaskIds;
      case "Solve":
        return solveTaskIds;
      case "Evaluate":
        return evaluateTaskIds;
      case "Archived":
        return archivedTaskIds;
    }
  };

  const canCreateTasks = () => {
    if (!isAuthorized()) return false;

    const me = identity()?.getPrincipal();
    if (!me) return false;

    const myProfile = profiles[me.toText()];
    if (!myProfile) return false;

    return !!myProfile.employment;
  };

  let ref: HTMLDivElement;

  const handleFetch = async () => {
    if (fetching()) return;

    setFetching(true);

    let more = false;

    if (tab() === "Archived") {
      await fetchArchivedTaskIds();
      more = await fetchArchivedTaskIds();
    } else {
      await fetchTaskIds(tab());
    }

    setCanFetchMore(more);
    setFetching(false);
  };

  return (
    <Page ref={ref!} class="self-stretch pt-10">
      <div class="flex flex-col gap-20">
        <Show when={canCreateTasks()}>
          <A class="flex flex-col" href={ROOT.$.tasks.$.create.path}>
            <Btn
              text="Create New Task"
              icon={EIconKind.DocEdit}
              iconColor={COLORS.green}
            />
          </A>
        </Show>
        <TasksPageTabs onTabChange={setTab} />
        <div class="flex flex-col gap-10">
          <For
            fallback={
              <p class="font-primary font-medium text-2xl text-center">
                No tasks
              </p>
            }
            each={ids()}
          >
            {(id) => (
              <A
                href={`${ROOT.$.task.path}?id=${id.toString()}`}
                class="flex flex-col"
              >
                <TaskMini id={id} />
              </A>
            )}
          </For>
        </div>
      </div>
      <Show when={canFetchMore()}>
        <Show
          when={fetching()}
          fallback={<Btn text="Load More" onClick={handleFetch} />}
        >
          <p class="text-gray-190 font-primary font-light text-md">
            Loading...
          </p>
        </Show>
      </Show>
    </Page>
  );
}
