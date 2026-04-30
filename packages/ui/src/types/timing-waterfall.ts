import type { TimingPhaseName } from "@invoke/core";

export interface PhaseDefinition {
  name: TimingPhaseName;
  label: string;
}

export type PhaseView = PhaseDefinition & {
  startMs: number;
  durationMs: number;
  leftPct: number;
  widthPct: number;
};

export interface AttemptView {
  key: string;
  label: string;
  url: string;
  status?: number;
  totalMs: number;
  phases: PhaseView[];
}
