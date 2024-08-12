import {
  Accessor,
  batch,
  createContext,
  createEffect,
  createSignal,
  onMount,
  useContext,
} from "solid-js";
import { IChildren, ONE_MIN_NS } from "../utils/types";
import { ErrorCode, err, logInfo } from "../utils/error";
import { Identity, Agent } from "@dfinity/agent";
import { MsqClient, MsqIdentity } from "@fort-major/msq-client";
import {
  Principal,
  bytesToHex,
  debugStringify,
  hexToBytes,
} from "../utils/encoding";
import {
  makeAgent,
  makeAnonymousAgent,
  newFmjActor,
  newHumansActor,
  newIcpActor,
  newLiquidDemocracyActor,
  newReputationActor,
  optUnwrap,
} from "../utils/backend";
import { E8s } from "../utils/math";
import {
  GetProfilesResponse,
  ProfileProofBody,
} from "@/declarations/humans/humans.did";
import { delay, fromCBOR, toCBOR } from "@fort-major/msq-shared";
import { ReputationProofBody } from "@/declarations/reputation/reputation.did";
import { generatePoW, PROOF_TTL_MS } from "@utils/security";

export interface IMyBalance {
  Hour: E8s;
  Storypoint: E8s;
  FMJ: E8s;
  ICP: E8s;
}

export interface IAuthStoreContext {
  authorize: () => Promise<boolean>;
  deauthorize: () => Promise<boolean>;
  identity: Accessor<Identity | undefined>;
  msqClient: Accessor<MsqClient | undefined>;

  agent: Accessor<Agent | undefined>;
  anonymousAgent: Accessor<Agent | undefined>;

  isAuthorized: Accessor<boolean>;
  isReadyToFetch: Accessor<boolean>;
  assertReadyToFetch: () => never | void;
  assertAuthorized: () => never | void;

  disabled: Accessor<boolean>;
  disable: () => void;
  enable: () => void;

  editMyProfile: (name?: string) => Promise<void>;

  myBalance: Accessor<IMyBalance | undefined>;
  fetchMyBalance: () => Promise<void>;
}

const AuthContext = createContext<IAuthStoreContext>();

export function useAuth(): IAuthStoreContext {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    err(ErrorCode.UNREACHEABLE, "Auth context is not initialized");
  }

  return ctx;
}

export function AuthStore(props: IChildren) {
  const [identity, setIdentity] = createSignal<Identity | undefined>();
  const [msqClient, setMsqClient] = createSignal<MsqClient | undefined>();
  const [agent, setAgent] = createSignal<Agent | undefined>();
  const [anonymousAgent, setAnonymousAgent] = createSignal<Agent | undefined>();
  const [myBalance, setMyBalance] = createSignal<IMyBalance | undefined>();
  const [disabled, setDisabled] = createSignal(false);

  onMount(async () => {
    makeAnonymousAgent().then((a) => setAnonymousAgent(a));

    if (retrieveHasMetaMask()) {
      const res = await MsqClient.create();

      if ("Ok" in res) {
        setMsqClient(res.Ok);

        return authorize();
      }
    }
  });

  createEffect(() => {
    if (isAuthorized()) {
      fetchMyBalance();
    }
  });

  const deauthorize: IAuthStoreContext["deauthorize"] = async () => {
    assertAuthorized();

    const msq = msqClient()!;

    const res = await msq.requestLogout();

    if (res) {
      batch(() => {
        setAgent(undefined);
        setMyBalance(undefined);
        setIdentity(undefined);
      });
    }

    return res;
  };

  const authorize: IAuthStoreContext["authorize"] = async () => {
    const msq = msqClient();

    if (msq) {
      let id: MsqIdentity | null;

      if (await msq.isAuthorized()) {
        id = await MsqIdentity.create(msq);
      } else {
        id = await msq.requestLogin();
      }

      if (!id) {
        return false;
      }

      let a = await makeAgent(id as unknown as Identity);

      const humansActor = newHumansActor(a);
      const reputationActor = newReputationActor(a);

      // set initiator-only one-time init function
      (window as any).init_once = () => {
        return Promise.all([
          humansActor.humans__init_once(),
          reputationActor.reputation__init_once(),
        ]);
      };

      const { entries: profiles } = await humansActor.humans__get_profiles({
        ids: [id.getPrincipal()],
      });

      if (!profiles[0][0]) {
        logInfo(`First time here? Registering, please stand by...`);

        const name = await id.getPseudonym();
        const [pow, nonce] = await generatePoW(
          id.getPrincipal(),
          Principal.fromText(import.meta.env.VITE_HUMANS_CANISTER_ID)
        );

        await humansActor.humans__register({
          name: [name],
          pow,
          nonce,
        });

        logInfo("Registered!");
      }

      batch(() => {
        setIdentity(id as unknown as Identity);
        setAgent(a);
      });

      logInfo("Login successful");

      return true;
    }

    const res = await MsqClient.create();

    if ("Ok" in res) {
      storeHasMetaMask();
      setMsqClient(res.Ok);

      return authorize();
    }

    logInfo("Using Google Chrome? Make sure you've allowed pop-ups to appear!");
    err(ErrorCode.AUTH, debugStringify(res));
  };

  const editMyProfile: IAuthStoreContext["editMyProfile"] = async (name) => {
    assertAuthorized();

    const n: [string] | [] = name ? [name] : [];

    const humansActor = newHumansActor(agent()!);

    await humansActor.humans__edit_profile({
      new_name_opt: [n],
    });
  };

  const fetchMyBalance = async () => {
    assertAuthorized();
    const a = agent()!;

    const humansActor = newHumansActor(a);
    const icpActor = newIcpActor(a);
    const fmjActor = newFmjActor(a);

    const myPrincipal = identity()!.getPrincipal();

    const p = [
      humansActor.humans__get_profiles({ ids: [myPrincipal] }),
      icpActor.icrc1_balance_of({ owner: myPrincipal, subaccount: [] }),
      fmjActor.icrc1_balance_of({ owner: myPrincipal, subaccount: [] }),
    ];

    const [{ entries: profiles }, icpBalance, fmjBalance] = (await Promise.all(
      p
    )) as [GetProfilesResponse, bigint, bigint];

    const myProfile = optUnwrap(profiles[0]);

    if (!myProfile) {
      err(
        ErrorCode.UNREACHEABLE,
        "At this point the profile should already exist"
      );
    }

    setMyBalance({
      Hour: E8s.new(myProfile.hours_balance),
      Storypoint: E8s.new(myProfile.storypoints_balance),
      ICP: E8s.new(icpBalance),
      FMJ: E8s.new(fmjBalance),
    });
  };

  const isAuthorized = () => {
    return !!agent();
  };

  const isReadyToFetch = () => {
    return !!anonymousAgent();
  };

  const assertReadyToFetch = () => {
    if (!isReadyToFetch()) {
      err(ErrorCode.UNREACHEABLE, "Not ready to fetch");
    }
  };

  const assertAuthorized = () => {
    if (!isAuthorized()) {
      err(ErrorCode.UNREACHEABLE, "Not authorized");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        identity,
        authorize,
        deauthorize,
        msqClient,
        agent,
        anonymousAgent,
        isAuthorized,
        isReadyToFetch,
        assertReadyToFetch,
        assertAuthorized,
        editMyProfile,
        myBalance,
        fetchMyBalance,
        disabled,
        disable: () => setDisabled(true),
        enable: () => setDisabled(false),
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

function retrieveHasMetaMask() {
  return !!localStorage.getItem("fmj-has-metamask");
}

function storeHasMetaMask() {
  localStorage.setItem("fmj-has-metamask", "true");
}
