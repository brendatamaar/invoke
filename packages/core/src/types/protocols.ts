import type { Assertion, ExtractionRule } from "./assertion";
import type { AuthConfig } from "./auth";
import type { KeyValue, WebSocketMessageMode } from "./common";
import type { RequestConfig, RequestOptions, RequestScripts } from "./request";

export interface GraphQLRequestConfig {
  protocol?: "graphql";
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
  apq?: boolean;
  batchMode?: boolean;
}

export type WsPreset = "none" | "graphql-transport-ws";

export interface WsSavedMessage {
  id: string;
  label: string;
  body: string;
  type: "text" | "binary";
  autoSend: boolean;
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
  savedMessages?: WsSavedMessage[];
  autoReconnect?: boolean;
  preset?: WsPreset;
  presetQuery?: string;
  presetVariables?: string;
  ndjsonMode?: boolean;
  origin?: string;
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
  clientStreaming?: boolean;
  serverStreaming?: boolean;
}

export interface GrpcStreamMessage {
  bodyJson: string;
  done: boolean;
  error?: string;
  trailers?: { key: string; value: string }[];
  statusCode?: number;
  statusMessage?: string;
  durationMs?: number;
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

export type ProtocolRequestConfig =
  | RequestConfig
  | GraphQLRequestConfig
  | WebSocketRequestConfig
  | GrpcRequestConfig;
