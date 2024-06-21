import { Accessor, createContext, createSignal, useContext } from "solid-js";
import { Store, createStore } from "solid-js/store";
import { IChildren, TPrincipalStr } from "../utils/types";
import { ErrorCode, err, logErr } from "../utils/error";
import { Principal } from "@dfinity/principal";
import { Employment, Profile } from "../declarations/humans/humans.did";
import { useAuth } from "./auth";
import { newHumansActor, optUnwrap } from "../utils/backend";
import { E8s } from "../utils/math";

export interface IVoting {}

type TVotingIdStr = string;
type VotingsStore = Record<TVotingIdStr, IVoting>;

export interface IVotingsStoreContext {
  votings: Store<VotingsStore>;
}

const VotingsContext = createContext<IVotingsStoreContext>();

export function useVotings(): IVotingsStoreContext {
  const ctx = useContext(VotingsContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Votings context is not initialized");
  }

  return ctx;
}

export function VotingsStore(props: IChildren) {
  const { anonymousAgent, assertReadyToFetch } = useAuth();

  const [votings, setVotings] = createStore<VotingsStore>();

  const fetchVotings = ()

  return (
    <VotingsContext.Provider
      value={{
        votings,
      }}
    >
      {props.children}
    </VotingsContext.Provider>
  );
}
