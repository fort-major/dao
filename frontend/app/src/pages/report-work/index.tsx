import { ROOT } from "@/routes";
import { Backlink } from "@components/backlink";
import { CreateWorkReportDraftForm } from "@components/create-work-report-draft-form";
import { Page } from "@components/page";
import { useLocation, useNavigate } from "@solidjs/router";
import { TWorkReportId } from "@store/work-reports";
import { createEffect, onMount } from "solid-js";

export const ReportWorkPage = () => {
  const { query } = useLocation();
  const navigate = useNavigate();

  const id = () => (query["id"] ? BigInt(query["id"]) : undefined);
  const create = () => (query["create"] ? query["create"] == "true" : false);

  onMount(() => {
    if (id() === undefined) {
      navigate(ROOT.$.contributions.path);
    }
  });

  const handleDraftSave = () => {
    navigate(ROOT.$.contributions.path);
  };

  return (
    <Page slim outerClass="my-20">
      <div class="flex flex-col self-stretch gap-8">
        <Backlink to={ROOT.$.contributions.path} />
        <CreateWorkReportDraftForm
          onSave={handleDraftSave}
          id={id()!}
          create={create()}
        />
      </div>
    </Page>
  );
};
