import { ROOT } from "@/routes";
import { Backlink } from "@components/backlink";
import { Page } from "@components/page";
import { WorkReport } from "@components/work-report";
import { useLocation, useNavigate } from "@solidjs/router";
import { createEffect } from "solid-js";

export function ViewWorkReportPage() {
  const { query } = useLocation();
  const navigate = useNavigate();

  const id = () => (query["id"] ? BigInt(query["id"]) : undefined);
  const draft = () => (query["draft"] ? query["draft"] === "true" : false);

  createEffect(() => {
    if (id() === undefined) {
      navigate(ROOT.$.contributions.path);
    }
  });

  return (
    <Page slim outerClass="my-20">
      <div class="self-stretch flex flex-col gap-8">
        <Backlink to={ROOT.$.contributions.path} />
        <WorkReport id={id()!} draft={draft()} />
      </div>
    </Page>
  );
}
