import {
  ProfileProofBody,
  ReputationDelegationTreeNode,
  ReputationProofBody,
} from "@/declarations/votings/votings.did";
import { bytesToHex, debugStringify } from "./encoding";
import { ErrorCode, err } from "./error";
import { ONE_MIN_NS } from "./types";
import { fromCBOR, hexToBytes, toCBOR } from "@fort-major/msq-shared";
import { Agent } from "@fort-major/agent-js-fork";
import {
  newHumansActor,
  newLiquidDemocracyActor,
  newReputationActor,
} from "./backend";
import { E8s } from "./math";

export function eventHandler<E extends Event>(
  fn: (e: E) => void | Promise<void>
) {
  return (e: E) => {
    if (!e.isTrusted) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();

      err(ErrorCode.SECURITY_VIOLATION, "No automation allowed!");
    }

    Promise.resolve(fn(e)).catch((e) =>
      err(ErrorCode.UNKNOWN, debugStringify(e))
    );
  };
}

// 7.5 hours
export const PROOF_TTL_MS = Number((ONE_MIN_NS * 450n) / 1000_000n);

export const [getProfProof, getProfProofCert] =
  createProofStorage<ProfileProofBody>("fmj-profile-proof", async (agent) => {
    const humansActor = newHumansActor(agent);

    let cert: Uint8Array | undefined = undefined;

    const p = await humansActor.humans__get_profile_proofs.withOptions({
      onRawCertificatePolled: (c) => {
        cert = new Uint8Array(c);
      },
    })({});

    return [cert!, p.proof];
  });

export const [getRepProof, getRepProofCert] =
  createProofStorage<ReputationProofBody>(
    "fmj-reputation-proof",
    async (agent) => {
      const liquidDemocracyActor = newLiquidDemocracyActor(agent);

      let cert1: Uint8Array | undefined = undefined;
      await liquidDemocracyActor.liquid_democracy__get_liquid_democracy_proof.withOptions(
        {
          onRawCertificatePolled: (c) => {
            cert1 = new Uint8Array(c);
          },
        }
      )({});

      const reputationActor = newReputationActor(agent);

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
    }
  );

export function createProofStorage<T>(
  key: string,
  fetcher: (agent: Agent) => Promise<[Uint8Array, T]>
): [(agent: Agent) => Promise<T>, (agent: Agent) => Promise<Uint8Array>] {
  const fetchAndStore = async (
    agent: Agent,
    k: string
  ): Promise<[Uint8Array, T]> => {
    const [c, b] = await fetcher(agent);
    storeCert(k, c, b, Date.now());

    return [c, b];
  };

  const getBody = async (agent: Agent) => {
    const id = await agent.getPrincipal();
    const k = `${key}-${id.toText()}`;
    const now = Date.now();

    const stored = retrieveCert<T>(k);

    if (!stored || stored[2] + PROOF_TTL_MS <= now) {
      const [_, b] = await fetchAndStore(agent, k);

      return b;
    }

    return stored[1];
  };

  const getCert = async (agent: Agent) => {
    const id = await agent.getPrincipal();
    const k = `${key}-${id.toText()}`;
    const now = Date.now();

    const stored = retrieveCert<T>(k);

    if (!stored || stored[2] + PROOF_TTL_MS <= now) {
      const [c, _] = await fetchAndStore(agent, k);

      return c;
    }

    return stored[0];
  };

  return [getBody, getCert];
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

export function totalDelegatedRep(node: ReputationDelegationTreeNode): bigint {
  return node.followers.reduce(
    (prev, cur) => prev + cur.reputation,
    node.reputation
  );
}
