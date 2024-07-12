import { ROOT } from "@/routes";
import { Btn } from "@components/btn";
import { EIconKind } from "@components/icon";
import { Page } from "@components/page";
import { TaskMini } from "@components/task";
import { Title } from "@components/title";
import { A, useNavigate } from "@solidjs/router";
import { useAuth } from "@store/auth";
import { useHumans } from "@store/humans";
import { taskStageToOrd, useTasks } from "@store/tasks";
import { COLORS } from "@utils/colors";
import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

export function TasksPage() {
  const {
    tasks: t,
    fetchTasks,
    archivedTasks: at,
    fetchArchivedTasks,
  } = useTasks();
  const { isReadyToFetch, isAuthorized, identity } = useAuth();
  const { profiles } = useHumans();

  const [canFetchMore, setCanFetchMore] = createSignal(true);
  const [fetching, setFetching] = createSignal(false);
  const [fetchArchive, setFetchArchived] = createSignal(false);

  const canCreateTasks = () => {
    if (!isAuthorized()) return false;

    const me = identity()?.getPrincipal();
    if (!me) return false;

    const myProfile = profiles[me.toText()];
    if (!myProfile) return false;

    return !!myProfile.employment;
  };

  const tasks = () =>
    Object.values(t).sort((a, b) => {
      const dif = taskStageToOrd(a!.stage) - taskStageToOrd(b!.stage);

      if (dif === 0) return Number(a!.created_at - b!.created_at);
      else return dif;
    });

  const archivedTasks = () =>
    Object.values(at).sort((a, b) => Number(a!.created_at - b!.created_at));

  let ref: HTMLDivElement;

  const listener = () => {
    const shouldFetch =
      ref && ref.scrollTop + ref.clientHeight >= ref.scrollHeight;

    if (shouldFetch) {
      handleFetch();
    }
  };

  const handleFetch = async () => {
    setFetching(true);
    const more = fetchArchive()
      ? await fetchArchivedTasks()
      : await fetchTasks();
    if (!more && !fetchArchive()) {
      setFetchArchived(true);
      setCanFetchMore(true);
    } else {
      setCanFetchMore(more);
    }
    setFetching(false);
  };

  onMount(() => {
    window.addEventListener("scroll", listener);
  });

  onCleanup(() => {
    window.removeEventListener("scroll", listener);
  });

  createEffect(() => {
    if (isReadyToFetch()) handleFetch();
  });

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
        <div class="flex flex-col gap-10">
          <Title text="In-Progress Tasks" />
          <For
            fallback={<p class="font-primary font-medium text-2xl">No tasks</p>}
            each={tasks()}
          >
            {(task) => (
              <A
                href={`${ROOT.$.task.path}?id=${task!.id.toString()}`}
                class="flex flex-col shadow-sm p-5"
              >
                <TaskMini id={task!.id} />
              </A>
            )}
          </For>
        </div>
        <Show when={fetchArchive()}>
          <div class="flex flex-col gap-10">
            <Title text="Archive" />
            <For
              fallback={
                <p class="font-primary font-medium text-2xl">No tasks</p>
              }
              each={archivedTasks()}
            >
              {(task) => (
                <A
                  href={`${ROOT.$.task.path}?id=${task!.id.toString()}`}
                  class="flex flex-col shadow-sm p-5"
                >
                  <TaskMini id={task!.id} />
                </A>
              )}
            </For>
          </div>
        </Show>
      </div>
      <Show when={canFetchMore()}>
        <p class="text-gray-190 font-primary font-light text-md">
          <Show when={fetching()} fallback="Scroll down to load more">
            Loading...
          </Show>
        </p>
      </Show>
    </Page>
  );
}
