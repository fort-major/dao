import {
  DecisionTopicSet,
  ReputationDelegationTreeNode,
} from "@/declarations/votings/votings.did";
import { debugStringify, Principal } from "./encoding";
import { ErrorCode, err } from "./error";
import { E8s } from "./math";
import { ONE_MIN_NS } from "./types";

export function eventHandler<E extends Event>(
  fn: (e: E) => void | Promise<void>
) {
  return (e: E) => {
    if (!e.isTrusted) {
      e.preventDefault();
      e.stopImmediatePropagation();

      err(ErrorCode.SECURITY_VIOLATION, "No automation allowed!");
    }

    Promise.resolve(fn(e)).catch((e) =>
      err(ErrorCode.UNKNOWN, debugStringify(e))
    );
  };
}

// 7.5 hours
export const PROOF_TTL_MS = Number((ONE_MIN_NS * 450n) / 1000_000n);
