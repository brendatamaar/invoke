import type { Assertion, ExtractionRule } from "./assertion";
import type { AuthConfig } from "./auth";
import type { KeyValue, WebSocketMessageMode } from "./common";
import type { RequestConfig, RequestOptions, RequestScripts } from "./request";

export interface GraphQLRequestConfig {
  url: string;
  headers: KeyValue[];
  auth: AuthConfig;
  query: string;
  variables: string;
  operationName?: string;
  timeoutMs: number;
  assertions?: Assertion[];
  extractionRules?: ExtractionRule[];
  options?: RequestOptions;
  scripts?: RequestScripts;
}

export interface WebSocketRequestConfig {
  url: string;
  protocols?: string;
  headers: KeyValue[];
  auth: AuthConfig;
  messageMode: WebSocketMessageMode;
  message: string;
  timeoutMs?: number;
  variables?: KeyValue[];
  options?: RequestOptions;
  scripts?: RequestScripts;
}

export interface GrpcRequestConfig {
  address: string;
  service: string;
  method: string;
  metadata: KeyValue[];
  body: string;
  tls: boolean;
  timeoutMs: number;
  variables?: KeyValue[];
  options?: RequestOptions;
  scripts?: RequestScripts;
}

export interface GrpcMethodInfo {
  service: string;
  method: string;
  fullMethod: string;
  inputType: string;
  outputType: string;
  inputJson: string;
}

export interface GrpcExecuteResponse {
  bodyJson: string;
  metadata: KeyValue[];
  trailers: KeyValue[];
  statusCode: number;
  statusMessage: string;
  durationMs: number;
  error?: string;
}

export interface WebSocketRelayMessage {
  direction: "in" | "out" | "system";
  type: string;
  body: string;
  createdAt: number;
}

export type ProtocolRequestConfig = RequestConfig | GraphQLRequestConfig | WebSocketRequestConfig | GrpcRequestConfig;
