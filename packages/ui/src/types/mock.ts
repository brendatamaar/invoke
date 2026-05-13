import type { KeyValue } from "@invoke/core";

export type WebhookValidationType = "none" | "hmac" | "header";
export type HmacAlgorithm = "sha256" | "sha1" | "sha512";

export interface WebhookValidationConfig {
  type: WebhookValidationType;
  secret?: string;
  algorithm?: HmacAlgorithm;
  signatureHeader?: string;
  signaturePrefix?: string;
  headerName?: string;
  headerValue?: string;
}

export interface WebhookEntry {
  id: string;
  method: string;
  headers: KeyValue[];
  body: string;
  createdAt: number;
  validationPassed: boolean;
  validationError?: string;
}

export interface ProxyRecord {
  id: string;
  method: string;
  path: string;
  requestHeaders: KeyValue[];
  requestBody: string;
  status: number;
  responseHeaders: KeyValue[];
  responseBody: string;
  createdAt: number;
}

export type RouteTab = "response" | "sequences" | "headers";

export interface WebhookEndpoint {
  id: string;
  label: string;
  validation: WebhookValidationConfig;
}
