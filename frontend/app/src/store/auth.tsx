import {
  Accessor,
  createContext,
  createSignal,
  onMount,
  useContext,
} from "solid-js";
import { IChildren, TTimestamp } from "../utils/types";
import { ErrorCode, err, logInfo } from "../utils/error";
import { Identity, Agent } from "@dfinity/agent";
import { MsqClient, MsqIdentity } from "@fort-major/msq-client";
import { Principal, debugStringify } from "../utils/encoding";
import {
  makeAgent,
  makeAnonymousAgent,
  newFmjActor,
  newHumansActor,
  newIcpActor,
  newReputationActor,
  optUnwrap,
} from "../utils/backend";
import { E8s } from "../utils/math";
import { GetProfilesResponse } from "@/declarations/humans/humans.did";
import { DecisionTopicSet } from "@/declarations/liquid_democracy/liquid_democracy.did";

export interface IMyBalance {
  Hours: E8s;
  Storypoints: E8s;
  FMJ: E8s;
  ICP: E8s;
}

export interface IProfileProof {
  id: Principal;
  is_team_member: boolean;
}

export interface IReputationProof {
  id: Principal;
  reputation: E8s;
  reputation_total_supply: E8s;
  followers: { id: Principal; rep: E8s; topicset: DecisionTopicSet }[];
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
  assertWithProofs: () => never | void;
  profileProof: Accessor<IProfileProof | undefined>;
  profileProofCert: Accessor<Uint8Array | undefined>;
  reputationProof: Accessor<IReputationProof | undefined>;
  reputationProofCert: Accessor<Uint8Array | undefined>;
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
  const [profileProof, setProfileProof] = createSignal<
    IProfileProof | undefined
  >();
  const [profileProofCert, setProfileProofCert] = createSignal<
    Uint8Array | undefined
  >();
  const [reputationProof, setReputationProof] = createSignal<
    IReputationProof | undefined
  >();
  const [reputationProofCert, setReputationProofCert] = createSignal<
    Uint8Array | undefined
  >();
  const [myBalance, setMyBalance] = createSignal<IMyBalance | undefined>();

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
      const reputationActor = newReputationActor(a);

      // set initiator-only one-time init function
      (window as any).init_once = () => {
        return Promise.all([
          humansActor.humans__init_once(),
          reputationActor.reputation__init_once(),
        ]);
      };

      const pRep = reputationActor.reputation__get_reputation_proof.withOptions(
        {
          onRawCertificatePolled(cert) {
            setReputationProofCert(new Uint8Array(cert));
          },
        }
      )({ selector: { AllTopics: null } });

      const { entries: profiles } = await humansActor.humans__get_profiles({
        ids: [id.getPrincipal()],
      });

      if (!profiles[0][0]) {
        logInfo(
          `First time here? Registering ${id.getPrincipal().toText()}...`
        );

        const name = await id.getPseudonym();

        await humansActor.humans__register({
          name: [name],
        });
      }

      setIdentity(id as unknown as Identity);
      setAgent(a);

      logInfo("Login successful");

      const pProf = humansActor.humans__get_profile_proofs.withOptions({
        onRawCertificatePolled(cert) {
          setProfileProofCert(new Uint8Array(cert));
        },
      })({});

      const [{ proof: reputationProof }, { proof: profileProof }] =
        await Promise.all([pRep, pProf]);

      const profileProofExt: IProfileProof = {
        id: profileProof.id,
        is_team_member: profileProof.is_team_member,
      };

      const reputationProofExt: IReputationProof = {
        id: reputationProof.id,
        reputation: E8s.new(reputationProof.reputation),
        reputation_total_supply: E8s.new(
          reputationProof.reputation_total_supply
        ),
        followers: reputationProof.followers.map(([id, [rep, topicset]]) => ({
          id,
          rep: E8s.new(rep),
          topicset,
        })),
      };

      logInfo("Proofs fetched successfully");

      setProfileProof(profileProofExt);
      setReputationProof(reputationProofExt);

      return true;
    }

    const res = await MsqClient.create();

    if ("Ok" in res) {
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
    assertWithProofs();

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
      Hours: E8s.new(myProfile.hours_balance),
      Storypoints: E8s.new(myProfile.storypoints_balance),
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

  const assertWithProofs = () => {
    if (
      !profileProof() ||
      !profileProofCert() ||
      !reputationProof() ||
      !reputationProofCert()
    ) {
      err(ErrorCode.UNREACHEABLE, "Proofs are not fetched");
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
        assertWithProofs: assertWithProofs,
        profileProof,
        profileProofCert,
        reputationProof,
        reputationProofCert,
        editMyProfile,
        myBalance,
        fetchMyBalance,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}
