import { debugStringify } from "./encoding";
import { ErrorCode, err } from "./error";

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
