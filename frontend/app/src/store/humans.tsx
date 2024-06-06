import { createContext, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TPrincipalStr } from "../utils/types";
import { ErrorCode, err } from "../utils/error";
import { IProfile, fetchMockProfiles } from "../data/entities/profile";
import { Principal } from "@dfinity/principal";

type ProfilesStore = Partial<Record<TPrincipalStr, IProfile>>;

export interface IHumanStoreContext {
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
  const [profiles, setProfiles] = createStore<ProfilesStore>();

  const fetchProfiles = async (ids: Principal[]) => {
    const profiles = await fetchMockProfiles(ids);

    for (let profile of profiles) {
      setProfiles(profile.id.toText(), profile);
    }
  };

  return (
    <HumanContext.Provider value={{ profiles, fetchProfiles }}>
      {props.children}
    </HumanContext.Provider>
  );
}
