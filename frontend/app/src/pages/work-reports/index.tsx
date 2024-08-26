import { ROOT } from "@/routes";
import { Btn } from "@components/btn";
import { EIconKind } from "@components/icon";
import { Page } from "@components/page";
import { WorkReport } from "@components/work-report";
import { WorkReportFilter } from "@components/work-report-filter";
import { useNavigate } from "@solidjs/router";
import { useAuth } from "@store/auth";
import { useWorkReports } from "@store/work-reports";
import { COLORS } from "@utils/colors";
import { createEffect, createSignal, For, on, onMount, Show } from "solid-js";

export const WorkReportsPage = () => {
  const { isReadyToFetch } = useAuth();
  const {
    fetchFiltered,
    workReportIds,
    filter,
    createWorkReportDraft,
    canCreateWorkReports,
  } = useWorkReports();
  const navigate = useNavigate();

  const [canLoadMore, setCanLoadMore] = createSignal(false);

  createEffect(
    on(isReadyToFetch, (ready) => {
      if (ready && workReportIds.length === 0) {
        fetchFiltered().then(setCanLoadMore);
      }
    })
  );

  const handleReportClick = () => {
    const id = createWorkReportDraft();

    navigate(
      `${ROOT.$.contributions.$.report.path}?id=${id.toString()}&create=true`
    );
  };

  const handleLoadMoreClick = () => {
    fetchFiltered().then(setCanLoadMore);
  };

  return (
    <Page slim outerClass="my-20">
      <div class="flex flex-col gap-8 self-stretch">
        <h1 class="text-6xl font-semibold">Contributions</h1>

        <p>
          Fort Major DAO allows complete freedom in contributions. Do anything
          you good at and report your work here. Once the DAO verifies your
          contribution and gives you a score, you'll get rewarded.
        </p>

        <p>
          Any contribution matters. Helped us coding new features and finding
          bugs? You deserve a reward! Promoted MSQ or FMJ on social media?
          Great! Designed a poster? Edited a video? Made a meme? Wrote a
          tutorial for others? Publish your work and report this contribution!
        </p>

        <Btn
          text="Report Contribution"
          icon={EIconKind.Plus}
          iconColor={COLORS.green}
          onClick={handleReportClick}
          disabled={!canCreateWorkReports()}
        />

        <WorkReportFilter onRefetchNeeded={handleLoadMoreClick} />

        <div class="flex flex-col gap-10">
          <For each={workReportIds}>
            {(id) => (
              <WorkReport
                id={id}
                mini
                onClick={() =>
                  navigate(
                    `${
                      ROOT.$.contributions.$.view.path
                    }?id=${id.toString()}&draft=${filter().myDrafts}`
                  )
                }
                draft={filter().myDrafts}
              />
            )}
          </For>
        </div>

        <Show when={canLoadMore()}>
          <Btn text="Load more" onClick={handleLoadMoreClick} />
        </Show>
      </div>
    </Page>
  );
};
