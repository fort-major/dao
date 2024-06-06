export enum ErrorCode {
  SECURITY_VIOLATION = 2,
  UNREACHEABLE = 1,
  UNKNOWN = -1,
}

export function err(code: ErrorCode, msg?: string): never {
  throw new Error(`[code: ${code}]${msg ? `: ${msg}` : ""}`);
}
