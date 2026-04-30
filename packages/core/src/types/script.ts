import type { ExecuteResponse } from "./response";
import type { ProtocolRequestConfig } from "./protocols";

export interface ScriptExecutionResult<TRequest extends ProtocolRequestConfig = ProtocolRequestConfig> {
  request: TRequest;
  variables: Record<string, string>;
  logs: string[];
  skipped?: boolean;
  skipReason?: string;
}

export interface ScriptRunOptions {
  timeoutMs?: number;
  response?: ExecuteResponse;
}
