import type {
  AssertionMatcher,
  AssertionType,
  ExtractionSource,
  TimingPhaseName,
} from "@invoke/core";

export type ResponseTab =
  | "body"
  | "headers"
  | "timing"
  | "tls"
  | "assertions"
  | "code"
  | "auth"
  | "visualize"
  | "console"
  | "graphql-errors";

export interface AssertionDraft {
  type: AssertionType;
  expression: string;
  matcher: AssertionMatcher;
  expected: string;
}

export interface ExtractionDraft {
  variableName: string;
  source: ExtractionSource;
  expression: string;
}

export interface PhaseBar {
  name: TimingPhaseName;
  label: string;
  color: string;
  startMs: number;
  durationMs: number;
  leftPct: number;
  widthPct: number;
}
