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
import { PROOF_TTL_MS } from "@utils/security";

export interface IMyBalance {
  Hour: E8s;
  Storypoint: E8s;
  FMJ: E8s;
  ICP: E8s;
}

export interface IAuthStoreContext {
  authorize: () => Promise<boolean>;
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

  profileProof: () => Promise<ProfileProofBody | undefined>;
  profileProofCert: () => Promise<Uint8Array | undefined>;
  reputationProof: () => Promise<ReputationProofBody | undefined>;
  reputationProofCert: () => Promise<Uint8Array | undefined>;

  editMyProfile: (name?: string) => Promise<void>;

  myBalance: Accessor<IMyBalance | undefined>;
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
  const [profileProof, profileProofCert] = createProofSignal<ProfileProofBody>(
    "fmj-profile-proof",
    async () => {
      while (!isAuthorized()) {
        await delay(1000);
      }

      const a = agent()!;
      const humansActor = newHumansActor(a);

      let cert: Uint8Array | undefined = undefined;

      const p = await humansActor.humans__get_profile_proofs.withOptions({
        onRawCertificatePolled: (c) => {
          cert = new Uint8Array(c);
        },
      })({});

      return [cert!, p.proof];
    }
  );
  const [reputationProof, reputationProofCert] =
    createProofSignal<ReputationProofBody>("fmj-reputation-proof", async () => {
      while (!isAuthorized()) {
        await delay(1000);
      }

      const a = agent()!;
      const liquidDemocracyActor = newLiquidDemocracyActor(a);

      let cert1: Uint8Array | undefined = undefined;
      await liquidDemocracyActor.liquid_democracy__get_liquid_democracy_proof.withOptions(
        {
          onRawCertificatePolled: (c) => {
            cert1 = new Uint8Array(c);
          },
        }
      )({});

      const reputationActor = newReputationActor(a);

      let cert2: Uint8Array | undefined = undefined;
      const response =
        await reputationActor.reputation__get_reputation_proof.withOptions({
          onRawCertificatePolled: (c) => {
            cert2 = new Uint8Array(c);
          },
        })({
          liquid_democracy_proof: {
            body: [],
            cert_raw: new Uint8Array(cert1!),
          },
        });

      return [cert2!, response.proof];
    });

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

      batch(() => {
        setIdentity(id as unknown as Identity);
        setAgent(a);
      });

      logInfo("Login successful");

      const { entries: profiles } = await humansActor.humans__get_profiles({
        ids: [id.getPrincipal()],
      });

      if (!profiles[0][0]) {
        logInfo(`First time here? Registering...`);

        const name = await id.getPseudonym();

        await humansActor.humans__register({
          name: [name],
        });
      }

      return true;
    }

    const res = await MsqClient.create();

    if ("Ok" in res) {
      storeHasMetaMask();
      setMsqClient(res.Ok);

      return authorize();
    }

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
    const humansActor = newHumansActor(agent()!);
    const icpActor = newIcpActor(agent()!);
    const fmjActor = newFmjActor(agent()!);

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
      err(ErrorCode.UNREACHEABLE, "Can't happen...");
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
        msqClient,
        agent,
        anonymousAgent,
        isAuthorized,
        isReadyToFetch,
        assertReadyToFetch,
        assertAuthorized,
        profileProof,
        profileProofCert,
        reputationProof,
        reputationProofCert,
        editMyProfile,
        myBalance,
        disabled,
        disable: () => setDisabled(true),
        enable: () => setDisabled(false),
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

interface StoredCert<T> {
  certHex: string;
  body: T;
  createdAtMs: number;
}

function storeCert<T>(
  key: string,
  cert: Uint8Array | undefined,
  body: T,
  now: number
) {
  if (!cert) {
    localStorage.removeItem(key);
    return;
  }

  const p: StoredCert<T> = {
    certHex: bytesToHex(cert),
    body,
    createdAtMs: now,
  };

  localStorage.setItem(key, toCBOR(p));
}

function retrieveCert<T>(key: string): [Uint8Array, T, number] | undefined {
  const pStr = localStorage.getItem(key);
  if (!pStr) {
    return undefined;
  }

  const p: StoredCert<T> = fromCBOR(pStr);

  return [hexToBytes(p.certHex), p.body, p.createdAtMs];
}

export function createProofSignal<T>(
  key: string,
  fetcher: () => Promise<[Uint8Array, T]>
): [() => Promise<T | undefined>, () => Promise<Uint8Array | undefined>] {
  const [createdAt, setCreatedAt] = createSignal<number | undefined>();
  const [cert, setCert] = createSignal<Uint8Array | undefined>();
  const [body, setBody] = createSignal<T | undefined>();

  const getBody = async () => {
    const now = Date.now();
    const b0 = body();
    const t0 = createdAt();

    if (!b0 || !t0) {
      const stored = retrieveCert<T>(key);

      if (stored) {
        batch(() => {
          setCert(stored[0]);
          setBody(stored[1] as undefined);
          setCreatedAt(stored[2]);
        });
      }
    }

    const b1 = body()!;
    const t1 = createdAt()!;

    if (!b1 || !t1 || t1 + PROOF_TTL_MS <= now) {
      const [newC, newB] = await fetcher();
      storeCert(key, newC, newB, now);

      batch(() => {
        setCert(newC);
        setBody(newB as undefined);
        setCreatedAt(now);
      });
    }

    return body()!;
  };

  const getCert = async () => {
    const now = Date.now();
    const c0 = cert();
    const t0 = createdAt();

    if (!c0 || !t0) {
      const stored = retrieveCert<T>(key);

      if (stored) {
        batch(() => {
          setCert(stored[0]);
          setBody(stored[1] as undefined);
          setCreatedAt(stored[2]);
        });
      }
    }

    const c1 = cert()!;
    const t1 = createdAt()!;

    if (!c1 || !t1 || t1 + PROOF_TTL_MS <= now) {
      const [newC, newB] = await fetcher();
      storeCert(key, newC, newB, now);
      batch(() => {
        setCert(newC);
        setBody(newB as undefined);
        setCreatedAt(now);
      });
    }

    return cert()!;
  };

  return [getBody, getCert];
}

function retrieveHasMetaMask() {
  return !!localStorage.getItem("fmj-has-metamask");
}

function storeHasMetaMask() {
  localStorage.setItem("fmj-has-metamask", "true");
}
