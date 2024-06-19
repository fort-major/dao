import { JSX } from "solid-js";

export interface IChildren {
  children?: JSX.Element;
}

export interface IClass {
  class?: string;
}

export type TTaskId = number;
export type TTaskTagId = number;
export type TTokenId = number;
export type TPrincipalStr = string;
export type TCommentId = number;

export type TE8s = bigint;
export type TTimestamp = bigint;
export type TMarkdown = string;

export const ONE_WEEK_NS = 1_000_000_000n * 60n * 60n * 24n * 7n;
