import { batch, createContext, createSignal, useContext } from "solid-js";
import { IChildren } from "../utils/types";
import {
  ErrorCode,
  err,
  logErr,
  logInfo,
  randomWaitingMessage,
} from "../utils/error";
import { useAuth } from "./auth";
import { E8s } from "../utils/math";

import {
  WorkReportFilter,
  WorkReportKind,
} from "@/declarations/work_reports/work_reports.did";
import {
  createStore,
  produce,
  SetStoreFunction,
  StoreSetter,
} from "solid-js/store";
import { newWorkReportsActor, opt, optUnwrap } from "@utils/backend";
import { debouncedBatchFetch } from "@utils/common";
import { generateWorkReportPoW, getRepProofCert } from "@utils/security";
import { Principal } from "@dfinity/principal";
import { useNavigate } from "@solidjs/router";
import { ROOT } from "@/routes";

export type TWorkReportId = bigint;
export type TWorkReportIdStr = string;
export type ICreateWorkReportArgs = {
  title: string;
  goal: string;
  description: string;
  result: string;
  wantRep: boolean;
  decisionTopic: number;
};
export type IEditWorkReportArgs = {
  id: TWorkReportId;
  newTitle?: string;
  newGoal?: string;
  newDescription?: string;
  newResult?: string;
  newWantRep?: boolean;
  newDecisionTopic: number;
};
export type IEvaluateWorkReportArgs = {
  id: TWorkReportId;
  score: E8s | null;
};

export interface IWorkReportsStoreContext {
  workReportIds: TWorkReportId[];
  workReports: Partial<Record<string, WorkReportKind>>;
  workReportDrafts: Partial<Record<string, IWorkReportDraft>>;
  setWorkReportDrafts: SetStoreFunction<
    Partial<Record<string, IWorkReportDraft>>
  >;

  filter: () => WorkReportFilter & { myDrafts: boolean };
  updateFilter: (newFilter: WorkReportFilter & { myDrafts: boolean }) => void;
  fetchFiltered: () => Promise<boolean>;

  canCreateWorkReports: () => boolean;
  canEditWorkReport: (id: TWorkReportId) => boolean;
  canEvaluateWorkReport: (id: TWorkReportId) => boolean;
  hasWorkReportDraft: (id: TWorkReportId) => boolean;

  fetchWorkReportIds: () => Promise<boolean>;
  fetchWorkReportsById: (ids: TWorkReportId[]) => Promise<void>;
  fetchWorkReportDraftIds: () => void;
  fetchWorkReportDrafts: () => void;
  fetchWorkReportDraftById: (id: TWorkReportId) => void;

  workReportToDraft: (id: TWorkReportId) => boolean;
  createWorkReportDraft: () => TWorkReportId;
  updateWorkReportDraft: (arg: {
    id: TWorkReportId;
    newTitle?: string;
    newDecisionTopicId?: number;
    newGoal?: string;
    newDescription?: string;
    newResult?: string;
    newWantRep?: boolean;
  }) => void;
  deleteWorkReportDraft: (id: TWorkReportId, noConfirm?: boolean) => void;
  canSubmitWorkReportDraft: (id: TWorkReportId) => boolean | string;
  submitWorkReportDraft: (id: TWorkReportId) => Promise<void>;
  evaluateWorkReport: (args: IEvaluateWorkReportArgs) => Promise<void>;
}

const WorkReportsContext = createContext<IWorkReportsStoreContext>();

export function useWorkReports(): IWorkReportsStoreContext {
  const ctx = useContext(WorkReportsContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Work Reports context is not initialized");
  }

  return ctx;
}

export function WorkReportsStore(props: IChildren) {
  const {
    anonymousAgent,
    assertReadyToFetch,
    assertAuthorized,
    isAuthorized,
    agent,
    identity,
    enable,
    disable,
    fetchMyBalance,
  } = useAuth();
  const navigate = useNavigate();

  const [workReportIds, setWorkReportIds] = createStore<
    IWorkReportsStoreContext["workReportIds"]
  >([]);
  const [workReports, setWorkReports] = createStore<
    IWorkReportsStoreContext["workReports"]
  >({});
  const [filter, setFilter] = createSignal<
    WorkReportFilter & { myDrafts: boolean }
  >({
    myDrafts: false,
    archived: false,
    decision_topic_id: [],
  });
  const [skip, setSkip] = createSignal(0);
  const [workReportDrafts, setWorkReportDrafts] = createStore<
    IWorkReportsStoreContext["workReportDrafts"]
  >({});

  const canCreateWorkReports = () => isAuthorized();
  const canEditWorkReport = (id: TWorkReportId): boolean => {
    if (!isAuthorized()) return false;

    const report = workReportDrafts[DRAFT_KEY(id)];

    if (!report) return false;

    return true;
  };
  const canEvaluateWorkReport = (id: TWorkReportId): boolean => {
    if (!isAuthorized()) return false;

    const report = workReports[id.toString()];

    if (!report) return false;

    if ("Archive" in report) {
      return false;
    }

    return true;
  };

  const fetchWorkReportIds = async () => {
    assertReadyToFetch();

    if (skip() === 0) {
      setWorkReportIds([]);
    }

    const actor = newWorkReportsActor(anonymousAgent()!);
    const { entries, pagination } = await actor.work_reports__get_ids({
      filter: filter(),
      pagination: {
        reversed: false,
        skip: skip(),
        take: 20,
      },
    });

    batch(() => {
      setWorkReportIds(
        produce((state) => {
          for (let id of entries as bigint[]) {
            state.push(id);
          }
        })
      );
      setSkip((s) => s + entries.length);
    });

    if (pagination.left == 0) {
      return false;
    }

    return true;
  };

  const fetchWorkReportsById = async (ids: TWorkReportId[]) => {
    assertReadyToFetch();

    workReportsGetByIds({ ids });
  };

  const workReportsGetByIds = debouncedBatchFetch(
    async function* (req: { ids: TWorkReportId[] }) {
      const actor = newWorkReportsActor(agent() ? agent()! : anonymousAgent()!);

      return await actor.work_reports__get_by_id(req);
    },
    ({ entries }, { ids }) => {
      for (let reportKind of entries.map((it) => optUnwrap(it))) {
        if (!reportKind) continue;

        if ("Common" in reportKind) {
          setWorkReports(reportKind.Common.id.toString(), reportKind);
          continue;
        }

        setWorkReports(reportKind.Archive.V0001.id.toString(), reportKind);
      }
    },
    (reason) =>
      err(ErrorCode.NETWORK, `Unable to fetch work reports: ${reason}`)
  );

  const updateFilter = (
    newFilter: WorkReportFilter & { myDrafts: boolean }
  ) => {
    batch(() => {
      setWorkReportIds([]);
      setFilter(newFilter);
      setSkip(0);
    });
  };

  const fetchFiltered = async () => {
    if (filter().myDrafts) {
      fetchWorkReportDraftIds();
      return false;
    } else {
      return await fetchWorkReportIds();
    }
  };

  const fetchWorkReportDraftIds = () => {
    const meta = retrieveMyDraftsMeta();
    if (!meta) return;

    setWorkReportIds([]);
    const filterDecisionTopic = optUnwrap(filter().decision_topic_id);

    for (let id of meta.ids) {
      const draft = retrieveMyDraft(id);
      if (!draft) continue;

      if (
        filterDecisionTopic === undefined ||
        filterDecisionTopic === draft.decisionTopicId
      ) {
        setWorkReportIds(workReportIds.length, id);
      }
    }
  };

  const fetchWorkReportDrafts = () => {
    const meta = retrieveMyDraftsMeta();
    if (!meta) return;

    for (let id of meta.ids) {
      fetchWorkReportDraftById(id);
    }
  };

  const fetchWorkReportDraftById = (id: TWorkReportId) => {
    const draft = retrieveMyDraft(id);
    if (!draft) return;

    setWorkReportDrafts(DRAFT_KEY(draft.id), draft);
  };

  const workReportToDraft: IWorkReportsStoreContext["workReportToDraft"] = (
    id
  ) => {
    const report = workReports[id.toString()];
    if (!report) return false;
    if ("Archive" in report) return false;

    const draft: IWorkReportDraft = {
      id: report.Common.id,
      title: report.Common.title,
      goal: report.Common.goal,
      description: report.Common.description,
      result: report.Common.result,
      decisionTopicId: report.Common.decision_topic,
      wantRep: report.Common.want_rep,
    };

    const meta = retrieveMyDraftsMeta() || { ids: [] };

    meta.ids.push(id);

    storeMyDraftsMeta(meta);
    storeMyDraft(draft);
    setWorkReportDrafts(DRAFT_KEY(draft.id), draft);

    return true;
  };

  const createWorkReportDraft: IWorkReportsStoreContext["createWorkReportDraft"] =
    () => {
      const meta = retrieveMyDraftsMeta() || { ids: [] };

      const id = BigInt(Math.floor(Math.random() * 100000000));
      meta.ids.push(id);

      storeMyDraftsMeta(meta);

      const draft: IWorkReportDraft = {
        id,
        title: "",
        goal: "",
        description: "",
        result: "",
        wantRep: false,
      };

      storeMyDraft(draft);
      setWorkReportDrafts(DRAFT_KEY(draft.id), draft);

      return id;
    };

  const updateWorkReportDraft: IWorkReportsStoreContext["updateWorkReportDraft"] =
    (arg) => {
      const draft = retrieveMyDraft(arg.id);

      if (!draft) {
        logErr(ErrorCode.UNREACHEABLE, "Draft not found");
        return;
      }

      if (arg.newTitle) {
        draft.title = arg.newTitle;
      }

      if (arg.newDecisionTopicId) {
        draft.decisionTopicId = arg.newDecisionTopicId;
      }

      if (arg.newGoal) {
        draft.goal = arg.newGoal;
      }

      if (arg.newDescription) {
        draft.description = arg.newDescription;
      }

      if (arg.newResult) {
        draft.result = arg.newResult;
      }

      if (arg.newWantRep) {
        draft.wantRep = arg.newWantRep;
      }

      setWorkReportDrafts(DRAFT_KEY(arg.id), draft);
      storeMyDraft(draft);
    };

  const deleteWorkReportDraft: IWorkReportsStoreContext["deleteWorkReportDraft"] =
    (id, noConfirm) => {
      const draft = retrieveMyDraft(id);

      if (!draft) {
        logErr(ErrorCode.UNREACHEABLE, "Draft not found");
        return;
      }

      const meta = retrieveMyDraftsMeta();
      if (!meta) {
        logErr(ErrorCode.UNREACHEABLE, "Draft Meta not found");
        return;
      }

      const idx = meta.ids.findIndex((it) => it === id);
      if (idx === -1) {
        logErr(ErrorCode.UNREACHEABLE, "Draft meta Id not found");
        return;
      }

      if (!noConfirm) {
        const agreed = confirm(`Are you sure you want to delete the draft?`);
        if (!agreed) return;
      }

      meta.ids.splice(idx, 1);
      storeMyDraftsMeta(meta);

      deleteMyDraft(id);
      setWorkReportDrafts(DRAFT_KEY(id), undefined);
      setWorkReportIds(
        produce((ids) => {
          const idx = ids.findIndex((it) => it === id);
          if (idx >= 0) {
            ids.splice(idx);
          }
        })
      );
    };

  const hasWorkReportDraft: IWorkReportsStoreContext["hasWorkReportDraft"] = (
    id
  ) => {
    return !!retrieveMyDraft(id);
  };

  const canSubmitWorkReportDraft: IWorkReportsStoreContext["canSubmitWorkReportDraft"] =
    (id) => {
      const draft = workReportDrafts[DRAFT_KEY(id)];

      if (!draft) return "draft not found";

      if (draft.decisionTopicId === undefined) return "Select a tag";
      if (draft.title.length < 10) return "The title is too short";
      if (draft.title.length > 256) return "The title is too long";
      if (draft.goal.length < 16) return "The goal is too short";
      if (draft.goal.length > 1024) return "The goal is too long";
      if (draft.description.length < 16) return "The description is too short";
      if (draft.description.length > 4096) return "The description is too long";
      if (draft.result.length < 16) return "The result is too short";
      if (draft.result.length > 1024) return "The result is too long";

      return true;
    };

  const submitWorkReportDraft: IWorkReportsStoreContext["submitWorkReportDraft"] =
    async (id) => {
      const draft = workReportDrafts[DRAFT_KEY(id)];

      if (!draft) {
        logErr(ErrorCode.UNREACHEABLE, "Draft not found");
        return;
      }

      const meta = retrieveMyDraftsMeta();
      if (!meta) {
        logErr(ErrorCode.UNREACHEABLE, "Draft Meta not found");
        return;
      }

      const idx = meta.ids.findIndex((it) => it === id);
      if (idx === -1) {
        logErr(ErrorCode.UNREACHEABLE, "Draft meta Id not found");
        return;
      }

      const agreed = confirm(
        "Are you sure you want to submit the draft? It will become public."
      );
      if (!agreed) return;

      let newId: TWorkReportId = await createWorkReport({
        title: draft.title,
        decisionTopic: draft.decisionTopicId!,
        goal: draft.goal,
        description: draft.description,
        result: draft.result,
        wantRep: draft.wantRep,
      });

      meta.ids.splice(idx, 1);
      storeMyDraftsMeta(meta);
      deleteMyDraft(id);
      fetchFiltered();

      navigate(`${ROOT.$.contributions.$.view.path}?id=${newId.toString()}`);
    };

  const createWorkReport = async (args: ICreateWorkReportArgs) => {
    assertAuthorized();

    disable();

    const actor = newWorkReportsActor(agent()!);

    logInfo("Processing... Please, don't close this page.");

    const [pow, nonce] = await generateWorkReportPoW(
      identity()!.getPrincipal(),
      Principal.fromText(import.meta.env.VITE_WORK_REPORTS_CANISTER_ID),
      args,
      () => logInfo(randomWaitingMessage())
    );

    const { id } = await actor.work_reports__create({
      decision_topic: args.decisionTopic,
      title: args.title,
      goal: args.goal,
      description: args.description,
      result: args.result,
      want_rep: args.wantRep,
      pow,
      nonce,
      reputation_proof: {
        body: [],
        cert_raw: await getRepProofCert(agent()!),
      },
    });

    logInfo(`Work Report #${id} has been created!`);

    enable();

    fetchWorkReportsById([id]);

    return id;
  };

  const evaluateWorkReport = async (args: IEvaluateWorkReportArgs) => {
    assertAuthorized();

    disable();

    const actor = newWorkReportsActor(agent()!);

    const { result } = await actor.work_reports__evaluate({
      id: args.id,
      score: args.score ? args.score.toBigIntRaw() : 0n,
      is_spam: !args.score,
      reputation_proof: {
        body: [],
        cert_raw: await getRepProofCert(agent()!),
      },
    });

    if (result.length > 0) {
      fetchFiltered();
      navigate(ROOT.$.contributions.path);

      logInfo(`Work Report #${args.id} evaluation is complete!`);
    } else {
      logInfo(`Work Report #${args.id} has been evaluated by you!`);
    }
    enable();

    fetchWorkReportsById([args.id]);
  };

  return (
    <WorkReportsContext.Provider
      value={{
        workReportIds,
        workReports,
        workReportDrafts,
        setWorkReportDrafts,
        canCreateWorkReports,
        canEditWorkReport,
        canEvaluateWorkReport,
        hasWorkReportDraft,
        filter,
        updateFilter,
        fetchFiltered,
        fetchWorkReportIds,
        fetchWorkReportsById,
        fetchWorkReportDraftIds,
        fetchWorkReportDraftById,
        fetchWorkReportDrafts,
        canSubmitWorkReportDraft,
        workReportToDraft,
        createWorkReportDraft,
        updateWorkReportDraft,
        deleteWorkReportDraft,
        submitWorkReportDraft,
        evaluateWorkReport,
      }}
    >
      {props.children}
    </WorkReportsContext.Provider>
  );
}

export interface IWorkReportDraft {
  id: bigint;
  decisionTopicId?: number;
  title: string;
  goal: string;
  description: string;
  result: string;
  wantRep: boolean;
}

export interface IMyDraftsMeta {
  ids: bigint[];
}

const META_KEY = "fmj-my-drafts-meta";

function retrieveMyDraftsMeta(): IMyDraftsMeta | undefined {
  const v = localStorage.getItem(META_KEY);
  if (!v) return undefined;

  const meta = JSON.parse(v);
  meta.ids = meta.ids.map((it: string) => BigInt(it));

  return meta;
}

function storeMyDraftsMeta(meta: IMyDraftsMeta) {
  const m = {
    ids: meta.ids.map((it) => it.toString()),
  };

  localStorage.setItem(META_KEY, JSON.stringify(m));
}

export function DRAFT_KEY(id: bigint) {
  return `fmj-my-drafts-${id.toString()}`;
}

function storeMyDraft(draft: IWorkReportDraft) {
  const d: any = { ...draft };
  d.id = draft.id.toString();

  localStorage.setItem(DRAFT_KEY(draft.id), JSON.stringify(d));
}

function deleteMyDraft(id: TWorkReportId) {
  localStorage.removeItem(DRAFT_KEY(id));
}

function retrieveMyDraft(id: TWorkReportId): IWorkReportDraft | undefined {
  const v = localStorage.getItem(DRAFT_KEY(id));
  if (!v) return undefined;

  const draft = JSON.parse(v);
  draft.id = BigInt(draft.id);

  return draft;
}
