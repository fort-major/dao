import { Accessor, createContext, createSignal, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TPrincipalStr } from "../utils/types";
import { ErrorCode, err } from "../utils/error";
import { Principal } from "@dfinity/principal";
import { Employment, Profile } from "../declarations/humans/humans.did";
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

export interface IHumanStoreContext {
  profiles: Store<ProfilesStore>;
  fetchProfiles: (ids?: Principal[] | TPrincipalStr[]) => Promise<void>;
  profileIds: Store<ProfileIdsStore>;
  fetchProfileIds: () => Promise<void>;
  totals: Accessor<[E8s, E8s]>;
  fetchTotals: () => Promise<void>;
}

const HumanContext = createContext<IHumanStoreContext>();

export function useHumans(): IHumanStoreContext {
  const ctx = useContext(HumanContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Human context is not initialized");
  }

  return ctx;
}

export function HumanStore(props: IChildren) {
  const { anonymousAgent, isReadyToFetch } = useAuth();

  const [profiles, setProfiles] = createStore<ProfilesStore>();
  const [profileIds, setProfileIds] = createStore<ProfileIdsStore>();
  const [totals, setTotals] = createSignal<[E8s, E8s]>([E8s.one(), E8s.one()]);

  const fetchTotals: IHumanStoreContext["fetchTotals"] = async () => {
    if (!isReadyToFetch()) {
      err(ErrorCode.UNREACHEABLE, "Not ready to fetch");
    }

    const humansActor = newHumansActor(anonymousAgent()!);
    const { hours, storypoints } =
      await humansActor.humans__get_total_hours_and_storypoints({});

    setTotals([new E8s(hours), new E8s(storypoints)]);
  };

  const fetchProfileIds: IHumanStoreContext["fetchProfileIds"] = async () => {
    if (!isReadyToFetch()) {
      err(ErrorCode.UNREACHEABLE, "Not ready to fetch");
    }

    const humansActor = newHumansActor(anonymousAgent()!);
    const { ids } = await humansActor.humans__get_profile_ids({});

    for (let id of ids) {
      setProfileIds(id.toText(), true);
    }
  };

  // refetches all known profiles when ids == undefined
  const fetchProfiles: IHumanStoreContext["fetchProfiles"] = async (ids) => {
    if (!isReadyToFetch()) {
      err(ErrorCode.UNREACHEABLE, "Not ready to fetch");
    }

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
      if (profiles[i][0]) {
        const p = profiles[i][0]!;
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
      } else {
        err(
          ErrorCode.UNREACHEABLE,
          `No profile with id ${ids[i].toText()} found`
        );
      }
    }
  };

  return (
    <HumanContext.Provider
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
    </HumanContext.Provider>
  );
}
