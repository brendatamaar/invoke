import type { DiffChangeType } from "./common";

export interface DiffChange {
  type: DiffChangeType;
  path: string;
  oldValue?: unknown;
  value?: unknown;
}

export interface DiffSummary {
  additions: number;
  deletions: number;
  changes: number;
}

export interface DiffResult {
  changes: DiffChange[];
  summary: DiffSummary;
  leftText: string;
  rightText: string;
  responseTimeDeltaMs: number;
  mode: "json" | "text";
}
