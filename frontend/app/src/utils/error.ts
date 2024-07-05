import { toast } from "solid-toast";

export enum ErrorCode {
  AUTH = "AUTH",
  SECURITY_VIOLATION = "SECURITY_VIOLATION",
  UNREACHEABLE = "UNREACHEABLE",
  UNKNOWN = "UNKNOWN",
  ICRC1 = "ICRC1",
  NETWORK = "NETWORK",
}

export function err(code: ErrorCode, msg?: string): never {
  const str = `[code: ${code}]${msg ? `: ${msg}` : ""}`;

  toast.error(str);
  throw new Error(str);
}

export function logErr(code: ErrorCode, msg?: string) {
  const str = `[code: ${code}]${msg ? `: ${msg}` : ""}`;

  console.error(str);
  toast.error(str);
}

export function logInfo(msg: string) {
  console.info(msg);
  toast(msg);
}
