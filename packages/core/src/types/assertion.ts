import type { ErrorObject } from "ajv";
import type {
  AssertionMatcher,
  AssertionType,
  ExtractionSource,
} from "./common";

export interface ExtractionRule {
  id?: string;
  variableName: string;
  source: ExtractionSource;
  expression: string;
  fallback?: string;
  enabled?: boolean;
}

export interface Assertion {
  id: string;
  type: AssertionType;
  expression: string;
  matcher: AssertionMatcher;
  expected: string;
  enabled?: boolean;
}

export interface AssertionResult {
  assertionId: string;
  passed: boolean;
  actual?: unknown;
  expected?: unknown;
  message: string;
}

export interface AssertionEvaluation {
  actual: unknown;
  expected: unknown;
  schemaPassed?: boolean;
  details?: ErrorObject[];
}
