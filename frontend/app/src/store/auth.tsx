import {
  Accessor,
  batch,
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
  newLiquidDemocracyActor,
  newReputationActor,
  optUnwrap,
} from "../utils/backend";
import { E8s } from "../utils/math";
import { GetProfilesResponse } from "@/declarations/humans/humans.did";
import { DecisionTopicSet } from "@/declarations/liquid_democracy/liquid_democracy.did";
import { ReputationDelegationTreeNode } from "@/declarations/votings/votings.did";

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

export interface IReputationDelegationTreeNode {
  id: Principal;
  reputation: E8s;
  topicset: DecisionTopicSet;
  followers: Array<IReputationDelegationTreeNode>;
}

function repDelegationTreeMap(
  node: ReputationDelegationTreeNode
): IReputationDelegationTreeNode {
  return {
    id: node.id,
    reputation: E8s.new(node.reputation),
    topicset: node.topicset,
    followers: node.followers.map(repDelegationTreeMap),
  };
}

export interface IReputationProof {
  reputation_total_supply: E8s;
  reputation_delegation_tree: IReputationDelegationTreeNode;
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
  fetchProofs: () => Promise<void>;
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

  const fetchProofs = async () => {
    assertAuthorized();

    setProfileProofCert();
    setReputationProofCert();

    const a = agent()!;

    const humansActor = newHumansActor(a);
    const liquidDemocracyActor = newLiquidDemocracyActor(a);
    const reputationActor = newReputationActor(a);

    const reputationProofPromise = new Promise<Uint8Array>((res) => {
      liquidDemocracyActor.liquid_democracy__get_liquid_democracy_proof.withOptions(
        {
          onRawCertificatePolled: (cert) => {
            const c = new Uint8Array(cert);

            reputationActor.reputation__get_reputation_proof
              .withOptions({
                onRawCertificatePolled: (cert) => res(new Uint8Array(cert)),
              })({ liquid_democracy_proof: { cert_raw: c, body: [] } })
              .then((response) => {
                let iproof: IReputationProof = {
                  reputation_total_supply: E8s.new(
                    response.proof.reputation_total_supply
                  ),
                  reputation_delegation_tree: repDelegationTreeMap(
                    response.proof.reputation_delegation_tree
                  ),
                };

                setReputationProof(iproof);
              });
          },
        }
      )({});
    });

    const profileProofPromise = new Promise<Uint8Array>((res) => {
      humansActor.humans__get_profile_proofs
        .withOptions({
          onRawCertificatePolled: (cert) => res(new Uint8Array(cert)),
        })({})
        .then((resp) => setProfileProof(resp.proof));
    });

    const [repCert, profileCert] = await Promise.all([
      reputationProofPromise,
      profileProofPromise,
    ]);

    batch(() => {
      setReputationProofCert(repCert);
      setProfileProofCert(profileCert);
    });

    logInfo("Proofs fetched successfully");
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

      fetchProofs();

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

  const areProofsFetched = () => {
    if (
      !profileProof() ||
      !profileProofCert() ||
      !reputationProof() ||
      !reputationProofCert()
    )
      return false;
    else return true;
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
    if (!areProofsFetched()) {
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
        fetchProofs,
        editMyProfile,
        myBalance,
        fetchMyBalance,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}
