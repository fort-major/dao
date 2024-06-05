import { JSX } from "solid-js";

export interface IChildren {
  children?: JSX.Element;
}

export interface IClass {
  class?: string;
}

export type TMilestoneId = number;
export type TTaskId = number;
export type TTaskTagId = number;
export type TTokenId = number;
export type TTeamId = number;
export type TSprintId = number;
export type TPrincipalStr = string;

export type TE8s = bigint;
export type TTimestamp = bigint;
export type TMarkdown = string;
