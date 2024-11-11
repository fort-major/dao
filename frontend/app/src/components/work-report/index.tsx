import { ROOT } from "@/routes";
import { AttentionMarker } from "@components/attention-marker";
import { Btn } from "@components/btn";
import { DecisionTopic } from "@components/decision-topic";
import { EIconKind } from "@components/icon";
import { MdPreview } from "@components/md-preview";
import { ProfileMini } from "@components/profile/profile";
import { Title } from "@components/title";
import { VotingProgressBar } from "@components/voting-progress-bar";
import { WorkReportEvalForm } from "@components/work-report-eval-form";
import { WorkReportProgressBar } from "@components/work-report-progress-bar";
import { useNavigate } from "@solidjs/router";
import { useAuth } from "@store/auth";
import { DRAFT_KEY, TWorkReportId, useWorkReports } from "@store/work-reports";
import { optUnwrap } from "@utils/backend";
import { timestampToStr } from "@utils/encoding";
import { E8s } from "@utils/math";
import { eventHandler, getRepProof, totalDelegatedRep } from "@utils/security";
import {
  createEffect,
  createResource,
  createSignal,
  Match,
  on,
  onMount,
  Show,
  Switch,
} from "solid-js";

export interface IWorkReportProps {
  id: TWorkReportId;
  draft?: boolean;
  mini?: boolean;
  onClick?: () => void;
}

export const WorkReport = (props: IWorkReportProps) => {
  const { isReadyToFetch, identity, agent, isAuthorized } = useAuth();
  const {
    fetchWorkReportsById,
    workReports,
    fetchWorkReportDraftById,
    workReportDrafts,
    canEditWorkReport,
    canEvaluateWorkReport,
    evaluateWorkReport,
  } = useWorkReports();
  const navigate = useNavigate();

  const [showEvalForm, setShowEvalForm] = createSignal(false);

  const [repProof] = createResource(agent, getRepProof);

  const report = () => {
    if (props.draft) {
      const r = workReportDrafts[DRAFT_KEY(props.id)];

      return r ? { Draft: r } : undefined;
    } else {
      return workReports[props.id.toString()];
    }
  };

  createEffect(() => {
    if (!report() && isReadyToFetch()) {
      if (props.draft) {
        fetchWorkReportDraftById(props.id);
      } else {
        fetchWorkReportsById([props.id]);
      }
    }
  });

  createEffect(
    on(isAuthorized, (ready) => {
      if (ready) {
        if (props.draft) {
          fetchWorkReportDraftById(props.id);
        } else {
          fetchWorkReportsById([props.id]);
        }
      }
    })
  );

  const updatedAt = () => {
    const r = report();

    if (!r) return "dd.mm.yyyy hh:mm";

    if ("Archive" in r) {
      return timestampToStr(r.Archive.V0001.updated_at);
    }

    if ("Draft" in r) {
      return "draft";
    }

    return timestampToStr(r.Common.updated_at);
  };

  const title = () => {
    const r = report();

    if (!r) return "Loading...";

    if ("Archive" in r) {
      return r.Archive.V0001.title;
    }

    if ("Draft" in r) {
      return r.Draft.title;
    }

    return r.Common.title;
  };

  const decisionTopic = () => {
    const r = report();

    if (!r) return undefined;

    if ("Archive" in r) {
      return r.Archive.V0001.decision_topic;
    }

    if ("Draft" in r) {
      return r.Draft.decisionTopicId;
    }

    return r.Common.decision_topic;
  };

  const reporterId = () => {
    const r = report();

    if (!r) return undefined;

    if ("Archive" in r) {
      return r.Archive.V0001.reporter;
    }

    if ("Draft" in r) {
      return identity()?.getPrincipal();
    }

    return r.Common.reporter;
  };

  const goal = () => {
    const r = report();

    if (!r) return undefined;

    if ("Archive" in r) {
      return r.Archive.V0001.goal;
    }

    if ("Draft" in r) {
      return r.Draft.goal;
    }

    return r.Common.goal;
  };

  const description = () => {
    const r = report();

    if (!r) return undefined;

    if ("Archive" in r) {
      return r.Archive.V0001.description;
    }

    if ("Draft" in r) {
      return r.Draft.description;
    }

    return r.Common.description;
  };

  const result = () => {
    const r = report();

    if (!r) return undefined;

    if ("Archive" in r) {
      return r.Archive.V0001.result;
    }

    if ("Draft" in r) {
      return r.Draft.result;
    }

    return r.Common.result;
  };

  const wantRep = () => {
    const r = report();

    if (!r) return undefined;

    if ("Archive" in r) {
      return r.Archive.V0001.want_rep;
    }

    if ("Draft" in r) {
      return r.Draft.wantRep;
    }

    return r.Common.want_rep;
  };

  const score = () => {
    const r = report();

    if (!r) return undefined;

    if ("Archive" in r) {
      return E8s.new(r.Archive.V0001.total_score);
    }

    return undefined;
  };

  const myEvaluation = () => {
    const r = report();

    if (!r) return undefined;

    if ("Common" in r) {
      return optUnwrap(r.Common.callers_evaluation);
    }

    return undefined;
  };

  const showPing = () => shouldBeEvaluated() && !myEvaluation() && repProof;

  const shouldBeEvaluated = () => {
    const r = report();

    if (!r) return false;
    if ("Common" in r) return true;

    return false;
  };

  const totalSupply = () => {
    const r = report();

    if (!r) return undefined;
    if ("Common" in r) {
      return E8s.new(r.Common.total_rep_supply);
    }

    return undefined;
  };

  const totalVoted = () => {
    const r = report();

    if (!r) return undefined;
    if ("Common" in r) {
      return E8s.new(r.Common.total_rep_evaluated);
    }

    return undefined;
  };

  const totalCalledSpam = () => {
    const r = report();

    if (!r) return undefined;
    if ("Common" in r) {
      return E8s.new(r.Common.total_rep_said_is_spam);
    }

    return undefined;
  };

  const handleClick = eventHandler(() => props.onClick?.());

  const handleEditClick = () => {
    navigate(`${ROOT.$.contributions.$.report.path}?id=${props.id}`);
  };

  const handleEvaluateClick = (score: E8s | null) => {
    evaluateWorkReport({ id: props.id, score });
  };

  return (
    <div
      class="flex flex-col shadow-md p-4 gap-6 relative"
      classList={{ "cursor-pointer": !!props.onClick }}
      onClick={handleClick}
    >
      <Show when={props.mini && showPing()}>
        <AttentionMarker />
      </Show>

      <div class="flex flex-col gap-2">
        <div class="flex justify-between items-center">
          <p class="text-xs text-gray-125">{props.id.toString()}</p>
          <p class="text-xs text-gray-125">{updatedAt()}</p>
        </div>
        <h2 class="text-4xl font-semibold">{title()}</h2>
        <div class="flex">
          <Show when={decisionTopic()}>
            <DecisionTopic id={decisionTopic()!} />
          </Show>
        </div>
      </div>

      <div class="flex items-end justify-between">
        <div class="flex flex-col gap-2">
          <ProfileMini id={reporterId()} />
        </div>

        <Show when={wantRep()}>
          <p class="text-sm italic text-right text-gray-140">
            Reputation requested
          </p>
        </Show>
      </div>
      <Show when={shouldBeEvaluated() && props.mini}>
        <div class="flex flex-col">
          <WorkReportProgressBar
            totalVoted={totalVoted()!}
            totalSupply={totalSupply()!}
            totalCalledSpam={totalCalledSpam()!}
            finishEarly={E8s.f0_67().mul(totalSupply()!)}
          />
        </div>
      </Show>
      <Show when={!props.mini && report()}>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <Title text="Context and Initial Goal" />
            <MdPreview content={goal()!} />
          </div>
          <div class="flex flex-col gap-2">
            <Title text="Contribution Description" />
            <MdPreview content={description()!} />
          </div>
          <div class="flex flex-col gap-2">
            <Title text="Immediate Results" />
            <MdPreview content={result()!} />
          </div>
        </div>
        <div class="p-2 bg-darkBlue text-white text-center">
          ✨ Join{" "}
          <a href="https://t.me/homeofmsq" target="_blank" class="underline">
            our Telegram group
          </a>{" "}
          where all the magic happens ✨
        </div>
        <div class="flex gap-2">
          <Show when={canEditWorkReport(props.id)}>
            <Btn text="Edit" icon={EIconKind.Edit} onClick={handleEditClick} />
          </Show>
        </div>
        <div class="flex justify-between items-baseline">
          <div class="flex gap-2 items-baseline">
            <Switch>
              <Match when={score()}>
                <p class="font-semibold text-xl italic">
                  {score()!.toPrecision(2)}
                </p>
                <p class="text-sm">Storypoints</p>
              </Match>
              <Match when={myEvaluation()}>
                <p class="font-semibold text-xl italic">
                  {E8s.new(myEvaluation()!.score).toPrecision(2)}
                </p>
                <p class="text-sm">Storypoints (my score)</p>
              </Match>
              <Match when={!myEvaluation() && shouldBeEvaluated()}>
                <p class="text-sm">Evaluation is in progress</p>
              </Match>
            </Switch>
          </div>
          <div class="flex justify-end">
            <Show when={shouldBeEvaluated()}>
              <Btn
                text={
                  showEvalForm()
                    ? "Hide"
                    : myEvaluation()
                    ? "Re-evaluate"
                    : "Evaluate"
                }
                disabled={!canEvaluateWorkReport(props.id)}
                onClick={() => setShowEvalForm((v) => !v)}
              />
            </Show>
          </div>
        </div>
        <Show when={showEvalForm()}>
          <Show when={!props.mini}>
            <div class="flex flex-col">
              <WorkReportProgressBar
                totalVoted={totalVoted()!}
                totalSupply={totalSupply()!}
                totalCalledSpam={totalCalledSpam()!}
                finishEarly={E8s.f0_67().mul(totalSupply()!)}
              />
            </div>
          </Show>
          <WorkReportEvalForm
            defaultScore={score()}
            onSubmit={handleEvaluateClick}
          />
        </Show>
      </Show>
    </div>
  );
};
