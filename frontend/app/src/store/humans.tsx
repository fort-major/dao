import { createContext, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TPrincipalStr, TTeamId } from "../utils/types";
import { ErrorCode, err } from "../utils/error";
import { ITeam, fetchMockTeams } from "../data/entities/team";
import { IProfile, fetchMockProfiles } from "../data/entities/profile";
import { Principal } from "@dfinity/principal";

type TeamsStore = Partial<Record<TTeamId, ITeam>>;
type ProfilesStore = Partial<Record<TPrincipalStr, IProfile>>;

export interface IHumanStoreContext {
  teams: Store<TeamsStore>;
  fetchTeams: (ids: TTeamId[]) => Promise<void>;

  profiles: Store<ProfilesStore>;
  fetchProfiles: (ids: Principal[]) => Promise<void>;
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
  const [teams, setTeams] = createStore<TeamsStore>();
  const [profiles, setProfiles] = createStore<ProfilesStore>();

  const fetchTeams = async (ids: TTeamId[]) => {
    const teams = await fetchMockTeams(ids);

    for (let team of teams) {
      setTeams(team.id, team);
    }
  };

  const fetchProfiles = async (ids: Principal[]) => {
    const profiles = await fetchMockProfiles(ids);

    for (let profile of profiles) {
      setProfiles(profile.id.toText(), profile);
    }
  };

  return (
    <HumanContext.Provider
      value={{ teams, fetchTeams, profiles, fetchProfiles }}
    >
      {props.children}
    </HumanContext.Provider>
  );
}
