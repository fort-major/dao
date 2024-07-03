import { JSX } from "solid-js";

export interface IChildren {
  children?: JSX.Element;
}

export interface IClass {
  class?: string;
}

export type TTaskId = bigint;
export type TTaskTagId = number;
export type TTokenId = number;
export type TPrincipalStr = string;
export type TCommentId = number;

export type TE8s = bigint;
export type TTimestamp = bigint;
export type TMarkdown = string;

export const ONE_SEC_NS = 1_000_000_000n;
export const ONE_MIN_NS = ONE_SEC_NS * 60n;
export const ONE_HOUR_NS = ONE_MIN_NS * 60n;
export const ONE_DAY_NS = ONE_HOUR_NS * 24n;
export const ONE_WEEK_NS = ONE_DAY_NS * 7n;
