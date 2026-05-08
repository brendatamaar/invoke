import type { KeyValue } from "@invoke/core";

export type WebhookValidationType = "none" | "hmac" | "header";
export type HmacAlgorithm = "sha256" | "sha1" | "sha512";

export interface WebhookValidationConfig {
  type: WebhookValidationType;
  // HMAC fields
  secret?: string;
  algorithm?: HmacAlgorithm;
  signatureHeader?: string;
  signaturePrefix?: string;
  // Header token fields
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

export interface ProxyRecordEntry {
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

export interface OAuth2PendingResult {
  status: "pending" | "done" | "error";
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  error?: string;
  timestamp: number;
}
