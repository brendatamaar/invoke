import type {
  AssertionMatcher,
  HttpMethod,
  KeyValue,
  MockConditionSource,
} from "./common";

export interface MockCondition {
  source: MockConditionSource;
  expression: string;
  matcher: AssertionMatcher;
  expected: string;
}

export interface MockRoute {
  id: string;
  enabled?: boolean;
  method: HttpMethod;
  pathPattern: string;
  status: number;
  headers: KeyValue[];
  body: string;
  latencyMs?: number;
  conditions?: MockCondition[];
}

export interface MockLogEntry {
  id: string;
  routeId?: string;
  matched: boolean;
  method: string;
  path: string;
  status: number;
  headers: KeyValue[];
  body: string;
  createdAt: number;
}
