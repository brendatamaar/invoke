import type { SavedRequest } from "./collection";
import type { RequestConfig } from "./request";
import type { ExecuteResponse, RequestRunResult } from "./response";
import type { VariableScope } from "./variables";

export interface CollectionRunnerOptions {
  execute: (request: RequestConfig) => Promise<ExecuteResponse>;
  scopes?: VariableScope[];
  stopOnFailure?: boolean;
  onRequestStart?: (req: SavedRequest, index: number) => void;
  onRequestComplete?: (result: RequestRunResult, index: number) => void;
}
