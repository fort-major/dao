import { ROOT } from "@/routes";
import { BooleanInput } from "@components/boolean-input";
import { Btn } from "@components/btn";
import { DecisionTopic } from "@components/decision-topic";
import { EIconKind } from "@components/icon";
import { MdInput } from "@components/md-input";
import { TextInput } from "@components/text-input";
import { useNavigate } from "@solidjs/router";
import { useAuth } from "@store/auth";
import { useVotings } from "@store/votings";
import { DRAFT_KEY, TWorkReportId, useWorkReports } from "@store/work-reports";
import { COLORS } from "@utils/colors";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

export interface ICreateWorkReportDraftFormProps {
  id: TWorkReportId;
  create: boolean;
  onSave: () => void;
}

export function CreateWorkReportDraftForm(
  props: ICreateWorkReportDraftFormProps
) {
  const navigate = useNavigate();
  const {
    workReportDrafts,
    setWorkReportDrafts,
    fetchWorkReportDraftById,
    createWorkReportDraft,
    updateWorkReportDraft,
    deleteWorkReportDraft,
    canSubmitWorkReportDraft,
    submitWorkReportDraft,
  } = useWorkReports();
  const { isAuthorized } = useAuth();
  const { decisionTopics } = useVotings();

  const key = () => DRAFT_KEY(_id());
  const draft = () => workReportDrafts[key()];

  const [edited, setEdited] = createSignal(false);
  const [isCreateMode, setIsCreateMode] = createSignal(props.create);
  const [_id, set_Id] = createSignal(props.id);

  createEffect(() => {
    if (!isAuthorized()) return;
    if (draft()) return;

    fetchWorkReportDraftById(props.id);
  });

  onMount(() => {
    setIsCreateMode(props.create);
    set_Id(props.id);
  });

  const heading = () => {
    if (isCreateMode()) {
      return "Create a new Contribution Report draft";
    } else {
      return `Edit Contribution Report draft`;
    }
  };

  const handlePublishClick = async () => {
    await submitWorkReportDraft(props.id);
  };

  const handleDeleteClick = () => {
    deleteWorkReportDraft(props.id);
    navigate(`${ROOT.$.contributions.path}`);
  };

  const handleSaveClick = () => {
    saveDraft();
    props?.onSave();
  };

  onCleanup(() => {
    if (!edited() && isCreateMode()) {
      deleteWorkReportDraft(_id(), true);
      setWorkReportDrafts(key(), undefined);
    }
  });

  const saveDraft = () => {
    updateWorkReportDraft({
      id: props.id,
      newTitle: draft()!.title,
      newDescription: draft()!.description,
      newDecisionTopicId: draft()!.decisionTopicId,
      newGoal: draft()!.goal,
      newResult: draft()!.result,
      newWantRep: draft()!.wantRep,
    });
  };

  const handleTitleEdit = (v: string) => {
    setEdited(true);
    setWorkReportDrafts(key(), "title", v);
    updateWorkReportDraft({
      id: props.id,
      newTitle: v,
    });
  };

  const handleTopicIdEdit = (v: number) => {
    setEdited(true);
    setWorkReportDrafts(key(), "decisionTopicId", v);
    updateWorkReportDraft({
      id: props.id,
      newDecisionTopicId: v,
    });
  };

  const handleGoalEdit = (v: string) => {
    setEdited(true);
    setWorkReportDrafts(key(), "goal", v);
    updateWorkReportDraft({
      id: props.id,
      newGoal: v,
    });
  };

  const handleDescriptionEdit = (v: string) => {
    setEdited(true);
    setWorkReportDrafts(key(), "description", v);
    updateWorkReportDraft({
      id: props.id,
      newDescription: v,
    });
  };

  const handleResultEdit = (v: string) => {
    setEdited(true);
    setWorkReportDrafts(key(), "result", v);
    updateWorkReportDraft({
      id: props.id,
      newResult: v,
    });
  };

  const handleWantRepEdit = (v: boolean) => {
    setEdited(true);
    setWorkReportDrafts(key(), "wantRep", v);
    updateWorkReportDraft({
      id: props.id,
      newWantRep: v,
    });
  };

  return (
    <div class="flex flex-col gap-8">
      <h1 class="font-semibold text-6xl">{heading()}</h1>
      <Show when={draft()}>
        <div class="flex items-center justify-between">
          <p class="text-gray-140 text-xs">{props.id.toString()}</p>
          <p class="text-gray-140 text-xs">Draft</p>
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-lg font-semibold">Title</p>
          <p class="text-sm font-light text-gray-140">
            Shortly describe your contribution like your ordering someone to do
            it. For example, instead of "I promoted MSQ in several Telegram
            channels", say "Promote MSQ in Telegram". 250 characters.
          </p>
          <TextInput
            value={draft()!.title ?? ""}
            onChange={(newTitle) => handleTitleEdit(newTitle.unwrap())}
            noMountCb
          />
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-lg font-semibold">Tag</p>
          <p class="text-sm font-light text-gray-140">
            Select a tag that describes the direction of your contribution the
            best. For example, if your goal is to promote MSQ or the DAO, select
            "Marketing".
          </p>
          <div class="flex gap-2 items-center">
            <For each={Object.keys(decisionTopics).map((it) => parseInt(it))}>
              {(topicId) => (
                <DecisionTopic
                  id={topicId}
                  selected={draft()!.decisionTopicId === topicId}
                  onSelect={() => handleTopicIdEdit(topicId)}
                />
              )}
            </For>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-lg font-semibold">Initial Goal</p>
          <p class="text-sm font-light text-gray-140">
            Describe your initial goal and give more context. What exactly you
            wanted to achieve, before starting the contribution. The editor
            supports Markdown. 1k characters.
          </p>
          <p class="text-sm font-light text-gray-140">
            Example: "I'm a 3D artist and I wanted to make a short 3D animation
            video of MSQ's Boops to upload it to YouTube Shorts. By doing this I
            wanted to promote MSQ Wallet.".
          </p>
          <MdInput
            noMountTrigger
            value={draft()?.goal ?? ""}
            onChange={(v) => handleGoalEdit(v.unwrap())}
          />
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-lg font-semibold">Detailed Description</p>
          <p class="text-sm font-light text-gray-140">
            Describe the contribution as good as you can. Don't forget a single
            evidence about the work you did. Provide as many links as needed.
            But don't overdo it, please - keep it simple, so others would
            understand you well and give you a fair evaluation score. The editor
            supports Markdown. 4k characters.
          </p>
          <p class="text-sm font-light text-gray-140">
            Example: "I downloaded all the vector images I need from this
            website [link] and all the sounds from this website [link]. Then I
            used Adobe After Effects to montage everything into a single video.
            All the work took around 8 hours. I wasn't too hard, because I'm
            very good at this stuff. Then I uploaded the video to YT, here is
            the link [link]. The video description contains a link to the MSQ's
            website."
          </p>
          <MdInput
            noMountTrigger
            value={draft()?.description ?? ""}
            onChange={(v) => handleDescriptionEdit(v.unwrap())}
          />
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-lg font-semibold">Immediate Results</p>
          <p class="text-sm font-light text-gray-140">
            Describe the results you have achieved with this contribution. Be
            specific - the DAO is only interested in immediate results (what can
            be verified right now), not the potential results. Remember, your
            contribution will be judged mostly by the results and how your work
            impacts the DAO or its projects.
          </p>
          <p class="text-sm font-light text-gray-140">
            Example: "As I publish this report, the video has been watched by
            ~10k people. My channel has received 100 more new subscribers
            because of that. I can see that some of those subscribers are now
            also joined the DAO's telegram channel, because their nicknames
            match."
          </p>
          <MdInput
            noMountTrigger
            value={draft()?.result ?? ""}
            onChange={(v) => handleResultEdit(v.unwrap())}
          />
        </div>
        <div class="flex flex-col items-start gap-2">
          <p class="text-lg font-semibold">Mint Reputation for you?</p>
          <p class="text-sm font-light text-gray-140">
            Reputation defines your voting power in various votings happening
            within the DAO. You can delegate your voting power to other DAO
            members via the "Me" tab. In future it will also define how much
            dividends you earn each month.
          </p>
          <p class="text-xs font-semibold">
            Only choose this option, if you're willing to participate in ALL the
            activities happening within Fort Major!
          </p>
          <BooleanInput
            value={draft()!.wantRep ?? false}
            onChange={handleWantRepEdit}
            labelOff="I need Reputation"
            labelOn="I need Reputation"
          />
        </div>
        <div class="flex gap-3 items-baseline justify-between">
          <div class="flex justify-start gap-3 items-center">
            <Btn
              text="Delete Draft"
              icon={EIconKind.CancelCircle}
              iconColor={COLORS.errorRed}
              onClick={handleDeleteClick}
            />
          </div>

          <div class="flex justify-end gap-3 items-baseline">
            <Btn
              text="Save Draft"
              icon={EIconKind.Edit}
              onClick={handleSaveClick}
            />
            <div class="flex flex-col gap-2">
              <Btn
                text="Publish Draft"
                icon={EIconKind.CheckCircle}
                iconColor={COLORS.green}
                disabled={canSubmitWorkReportDraft(props.id) !== true}
                onClick={handlePublishClick}
              />
              <Show
                when={typeof canSubmitWorkReportDraft(props.id) === "string"}
              >
                <p class="text-xs font-thin text-errorRed">
                  {canSubmitWorkReportDraft(props.id)}
                </p>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
