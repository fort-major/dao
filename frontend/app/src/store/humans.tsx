import { Accessor, createContext, createSignal, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TPrincipalStr } from "../utils/types";
import { ErrorCode, err, logErr } from "../utils/error";
import { Principal } from "@dfinity/principal";
import { useAuth } from "./auth";
import { newHumansActor, optUnwrap } from "../utils/backend";
import { E8s } from "../utils/math";

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
  earned_hours: E8s;
  hours_balance: E8s;
  storypoints_balance: E8s;
  earned_storypoints: E8s;
}

type ProfilesStore = Partial<Record<TPrincipalStr, IProfile>>;
type ProfileIdsStore = Partial<Record<TPrincipalStr, true>>;

export interface IHumansStoreContext {
  profiles: Store<ProfilesStore>;
  fetchProfiles: (ids?: Principal[] | TPrincipalStr[]) => Promise<void>;
  profileIds: Store<ProfileIdsStore>;
  fetchProfileIds: () => Promise<void>;
  totals: Accessor<[E8s, E8s]>;
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
  const [profileIds, setProfileIds] = createStore<ProfileIdsStore>();
  const [totals, setTotals] = createSignal<[E8s, E8s]>([E8s.one(), E8s.one()]);

  const fetchTotals: IHumansStoreContext["fetchTotals"] = async () => {
    assertReadyToFetch();

    const humansActor = newHumansActor(anonymousAgent()!);
    const { hours, storypoints } =
      await humansActor.humans__get_total_hours_and_storypoints({});

    setTotals([new E8s(hours), new E8s(storypoints)]);
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

    const humansActor = newHumansActor(anonymousAgent()!);
    const { profiles } = await humansActor.humans__get_profiles({ ids });

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
              hours_a_week_commitment: new E8s(e.hours_a_week_commitment),
              hours_earned_during_employment: new E8s(
                e.hours_earned_during_employment
              ),
            }
          : undefined,
        hours_balance: new E8s(p.hours_balance),
        earned_hours: new E8s(p.earned_hours),
        storypoints_balance: new E8s(p.storypoints_balance),
        earned_storypoints: new E8s(p.earned_storypoints),
      };

      setProfiles(id, profile);
      setProfileIds(id, true);
    }
  };

  return (
    <HumansContext.Provider
      value={{
        profiles,
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
