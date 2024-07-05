import { Accessor, createContext, createSignal, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TPrincipalStr } from "../utils/types";
import { ErrorCode, err, logErr } from "../utils/error";
import { Principal } from "@dfinity/principal";
import { useAuth } from "./auth";
import {
  newHumansActor,
  newReputationActor,
  optUnwrap,
} from "../utils/backend";
import { E8s } from "../utils/math";
import { GetTotalsResponse } from "@/declarations/humans/humans.did";
import { GetTotalSupplyResponse } from "@/declarations/reputation/reputation.did";
import { debouncedBatchFetch } from "@utils/common";

export interface IEmployment {
  hours_a_week_commitment: E8s;
  employed_at: bigint;
  hours_earned_during_employment: E8s;
}

export interface IProfile {
  id: Principal;
  avatar_src?: string;
  name?: string;
  registered_at: bigint;
  employment?: IEmployment;
  hours_balance: E8s;
  storypoints_balance: E8s;
  earned_hours: E8s;
  earned_storypoints: E8s;
}

export interface ITotals {
  hours: E8s;
  storypoints: E8s;
  reputation: E8s;
}

type ProfilesStore = Partial<Record<TPrincipalStr, IProfile>>;
type ProfileIdsStore = Partial<Record<TPrincipalStr, true>>;
type ReputationStore = Partial<Record<TPrincipalStr, E8s>>;

export interface IHumansStoreContext {
  profiles: Store<ProfilesStore>;
  reputation: Store<ReputationStore>;
  fetchProfiles: (ids?: Principal[] | TPrincipalStr[]) => Promise<void>;
  profileIds: Store<ProfileIdsStore>;
  fetchProfileIds: () => Promise<void>;
  totals: Accessor<ITotals>;
  fetchTotals: () => Promise<void>;
}

const HumansContext = createContext<IHumansStoreContext>();

export function useHumans(): IHumansStoreContext {
  const ctx = useContext(HumansContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Humans context is not initialized");
  }

  return ctx;
}

export function HumanStore(props: IChildren) {
  const { anonymousAgent, assertReadyToFetch } = useAuth();

  const [profiles, setProfiles] = createStore<ProfilesStore>();
  const [reputation, setReputation] = createStore<ReputationStore>();
  const [profileIds, setProfileIds] = createStore<ProfileIdsStore>();
  const [totals, setTotals] = createSignal<ITotals>({
    hours: E8s.one(),
    storypoints: E8s.one(),
    reputation: E8s.one(),
  });

  const fetchTotals: IHumansStoreContext["fetchTotals"] = async () => {
    assertReadyToFetch();

    const humansActor = newHumansActor(anonymousAgent()!);
    const reputationActor = newReputationActor(anonymousAgent()!);

    const p = [
      humansActor.humans__get_totals({}),
      reputationActor.reputation__get_total_supply({}),
    ];

    const [{ hours, storypoints }, { total_supply }] = (await Promise.all(
      p
    )) as [GetTotalsResponse, GetTotalSupplyResponse];

    setTotals({
      hours: E8s.new(hours),
      storypoints: E8s.new(storypoints),
      reputation: E8s.new(total_supply),
    });
  };

  const fetchProfileIds: IHumansStoreContext["fetchProfileIds"] = async () => {
    assertReadyToFetch();

    const humansActor = newHumansActor(anonymousAgent()!);
    const { ids } = await humansActor.humans__get_profile_ids({});

    for (let id of ids) {
      setProfileIds(id.toText(), true);
    }
  };

  // refetches all known profiles when ids == undefined
  const fetchProfiles: IHumansStoreContext["fetchProfiles"] = async (ids) => {
    assertReadyToFetch();

    if (!ids) {
      ids = Object.keys(profileIds);
    }

    if (ids.length == 0) return;

    ids = ids.map((id: Principal | TPrincipalStr) =>
      typeof id === "string" ? Principal.fromText(id) : id
    );

    humansGetProfiles({ ids });
    reputationGetBalances({ ids });
  };

  const reputationGetBalances = debouncedBatchFetch(
    (req: { ids: Principal[] }) => {
      const reputationActor = newReputationActor(anonymousAgent()!);

      return reputationActor.reputation__get_balance(req);
    },
    ({ entries: balances }, { ids }) => {
      for (let i = 0; i < balances.length; i++) {
        setReputation(ids[i].toText(), E8s.new(balances[i].balance));
      }
    },
    (reason) =>
      err(ErrorCode.NETWORK, `Unable to fetch reputation balances: ${reason}`)
  );

  const humansGetProfiles = debouncedBatchFetch(
    (req: { ids: Principal[] }) => {
      const humansActor = newHumansActor(anonymousAgent()!);

      return humansActor.humans__get_profiles(req);
    },
    ({ entries: profiles }, { ids }) => {
      for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i][0];

        if (!p) {
          logErr(
            ErrorCode.UNREACHEABLE,
            `No profile with id ${ids[i].toText()} found`
          );

          continue;
        }

        const id = p.id.toText();
        const e = optUnwrap(p.employment);

        const profile: IProfile = {
          id: p.id,
          name: optUnwrap(p.name),
          avatar_src: optUnwrap(p.avatar_src),
          registered_at: p.registered_at,
          employment: e
            ? {
                employed_at: e.employed_at,
                hours_a_week_commitment: E8s.new(e.hours_a_week_commitment),
                hours_earned_during_employment: E8s.new(
                  e.hours_earned_during_employment
                ),
              }
            : undefined,
          hours_balance: E8s.new(p.hours_balance),
          storypoints_balance: E8s.new(p.storypoints_balance),
          earned_hours: E8s.new(p.earned_hours),
          earned_storypoints: E8s.new(p.earned_storypoints),
        };

        setProfiles(id, profile);
        setProfileIds(id, true);
      }
    },
    (reason) => err(ErrorCode.NETWORK, `Unable to fetch profiles: ${reason}`)
  );

  return (
    <HumansContext.Provider
      value={{
        profiles,
        reputation,
        fetchProfiles,
        profileIds,
        fetchProfileIds,
        totals,
        fetchTotals,
      }}
    >
      {props.children}
    </HumansContext.Provider>
  );
}
