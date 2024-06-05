export enum ErrorCode {
  UNREACHEABLE = 1,
  UNKNOWN = -1,
}

export function err(code: ErrorCode, msg?: string): never {
  throw new Error(`[code: ${code}]${msg ? `: ${msg}` : ""}`);
}
