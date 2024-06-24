import {
  Accessor,
  createContext,
  createSignal,
  onMount,
  useContext,
} from "solid-js";
import { IChildren } from "../utils/types";
import { ErrorCode, err, logInfo } from "../utils/error";
import { Identity, Agent } from "@dfinity/agent";
import { MsqClient, MsqIdentity } from "@fort-major/msq-client";
import { Principal, debugStringify } from "../utils/encoding";
import {
  makeAgent,
  makeAnonymousAgent,
  newHumansActor,
} from "../utils/backend";
import { E8s } from "../utils/math";

export interface IProfileProof {
  id: Principal;
  reputation: E8s;
  is_team_member: boolean;
  reputation_total_supply: E8s;
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
  assertWithProof: () => never | void;
  profileProof: Accessor<IProfileProof | undefined>;
  profileProofCert: Accessor<Uint8Array | undefined>;
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
  const [profileProof, setProfileProof] = createSignal<
    IProfileProof | undefined
  >();
  const [profileProofCert, setProfileProofCert] = createSignal<
    Uint8Array | undefined
  >();

  onMount(async () => {
    setAnonymousAgent(await makeAnonymousAgent());
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
      const { profiles } = await humansActor.humans__get_profiles({
        ids: [id.getPrincipal()],
      });

      if (!profiles[0][0]) {
        logInfo(
          `First time here? Registering ${id.getPrincipal().toText()}...`
        );

        const name = await id.getPseudonym();
        const avatarSrc = await id.getAvatarSrc();

        await humansActor.humans__register({
          name: [name],
          avatar_src: [avatarSrc],
        });
      }

      setIdentity(id as unknown as Identity);
      setAgent(a);

      logInfo("Login successful");

      const { proof } =
        await humansActor.humans__get_profile_proofs.withOptions({
          onRawCertificatePolled(cert) {
            setProfileProofCert(new Uint8Array(cert));
          },
        })({});

      const proofExt: IProfileProof = {
        id: proof.id,
        is_team_member: proof.is_team_member,
        reputation: new E8s(proof.reputation),
        reputation_total_supply: new E8s(proof.reputation_total_supply),
      };

      logInfo("Profile proof fetched successfully");

      setProfileProof(proofExt);

      return true;
    }

    const res = await MsqClient.create();

    if ("Ok" in res) {
      setMsqClient(res.Ok);

      return authorize();
    }

    err(ErrorCode.AUTH, debugStringify(res));
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

  const assertWithProof = () => {
    if (!profileProof() || !profileProofCert()) {
      err(ErrorCode.UNREACHEABLE, "Profile proof is not fetched");
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
        assertWithProof,
        profileProof,
        profileProofCert,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}
