export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS"
  | (string & {});
export type BodyMode =
  | "none"
  | "json"
  | "form-data"
  | "urlencoded"
  | "raw"
  | "file"
  | "graphql-multipart";
export type AuthType =
  | "none"
  | "basic"
  | "bearer"
  | "api-key"
  | "oauth2"
  | "digest"
  | "aws-sigv4";
export type RequestProtocol = "rest" | "graphql" | "websocket" | "grpc";
export type AssertionType =
  | "status"
  | "responseTime"
  | "header"
  | "bodyJsonPath"
  | "bodySchema"
  | "regex";
export type AssertionMatcher =
  | "equals"
  | "notEquals"
  | "exists"
  | "gt"
  | "lt"
  | "contains"
  | "matches";
export type ExtractionSource = "body" | "header" | "status";
export type DiffChangeType = "add" | "remove" | "change";
export type WebSocketMessageMode = "text" | "json";
export type FlowStepType = "request" | "delay" | "condition" | "loop";
export type FlowStatus = "passed" | "failed" | "cancelled";
export type MockConditionSource = "header" | "query" | "bodyJsonPath";

export interface KeyValue {
  id?: string;
  key: string;
  value: string;
  enabled?: boolean;
  sensitive?: boolean;
  type?: "text" | "file";
  fileName?: string;
}
