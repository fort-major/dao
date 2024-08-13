import { strToTokens, tokensToStr } from "./encoding";
import { ErrorCode, err } from "./error";
import { ONE_DAY_NS, ONE_HOUR_NS, ONE_MIN_NS } from "./types";

export class E8s {
  constructor(public val: bigint) {
    if (val < 0n) {
      err(ErrorCode.UNREACHEABLE, "Unable to negate E8s");
    }
  }

  public static new(val: bigint) {
    return new E8s(val);
  }

  public eq(b: E8s): boolean {
    return this.val == b.val;
  }

  public gt(b: E8s): boolean {
    return this.val > b.val;
  }

  public ge(b: E8s): boolean {
    return this.val >= b.val;
  }

  public lt(b: E8s): boolean {
    return this.val < b.val;
  }

  public le(b: E8s): boolean {
    return this.val <= b.val;
  }

  public static zero(): E8s {
    return new E8s(0n);
  }

  public static one(): E8s {
    return new E8s(1_0000_0000n);
  }

  public static f0_05(): E8s {
    return new E8s(500_0000n);
  }

  public static f0_1(): E8s {
    return new E8s(1000_0000n);
  }

  public static f0_2(): E8s {
    return new E8s(2000_0000n);
  }

  public static f0_25(): E8s {
    return new E8s(2500_0000n);
  }

  public static f0_3(): E8s {
    return new E8s(3000_0000n);
  }

  public static f0_33(): E8s {
    return new E8s(3333_3333n);
  }

  public static f0_4(): E8s {
    return new E8s(4000_0000n);
  }

  public static f0_5(): E8s {
    return new E8s(5000_0000n);
  }

  public static f0_6(): E8s {
    return new E8s(6000_0000n);
  }

  public static f0_67(): E8s {
    return new E8s(6666_6667n);
  }

  public static f0_7(): E8s {
    return new E8s(7000_0000n);
  }

  public static f0_75(): E8s {
    return new E8s(7500_0000n);
  }

  public static f0_8(): E8s {
    return new E8s(8000_0000n);
  }

  public static f0_9(): E8s {
    return new E8s(9000_0000n);
  }

  public add(b: E8s): E8s {
    return new E8s(this.val + b.val);
  }

  public sub(b: E8s): E8s {
    return new E8s(this.val - b.val);
  }

  public mul(b: E8s): E8s {
    return new E8s((this.val * b.val) / 1_0000_0000n);
  }

  public div(b: E8s): E8s {
    return new E8s((this.val * 1_0000_0000n) / b.val);
  }

  public toString() {
    return tokensToStr(this.val, 8);
  }

  public static fromString(s: string): E8s {
    return E8s.new(strToTokens(s, 8));
  }

  public toPrecision(digits: number, allowEmptyTail: boolean = false) {
    return tokensToStr(this.val, 8, digits, false, allowEmptyTail);
  }

  public toBool() {
    return this.val > 0n;
  }

  public isZero() {
    return this.val === 0n;
  }

  public toBigIntRaw() {
    return this.val;
  }

  public static fromBigIntBase(x: bigint) {
    return new E8s(x * 1_0000_0000n);
  }

  public toBigIntBase() {
    return this.val / 1_0000_0000n;
  }

  public static fromPercentNum(p: number) {
    return new E8s((BigInt(Math.floor(p)) * 1_0000_0000n) / 100n);
  }

  public toPercentNum() {
    return Number((this.val * 100n) / 1_0000_0000n);
  }

  public toPercent() {
    return E8s.new(this.val * 100n);
  }
}

export function repToCooldownNs(rep: E8s): bigint | undefined {
  if (rep.ge(E8s.fromBigIntBase(500n))) return 0n;
  if (rep.ge(E8s.fromBigIntBase(100n))) return ONE_MIN_NS * 10n;
  if (rep.ge(E8s.fromBigIntBase(50n))) return ONE_HOUR_NS;
  if (rep.ge(E8s.fromBigIntBase(20n))) return ONE_DAY_NS;

  return undefined;
}
