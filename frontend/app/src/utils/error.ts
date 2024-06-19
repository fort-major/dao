import { toast } from "solid-toast";

export enum ErrorCode {
  AUTH = 3,
  SECURITY_VIOLATION = 2,
  UNREACHEABLE = 1,
  UNKNOWN = -1,
}

export function err(code: ErrorCode, msg?: string): never {
  const str = `[code: ${code}]${msg ? `: ${msg}` : ""}`;

  toast.error(str);
  throw new Error(str);
}
