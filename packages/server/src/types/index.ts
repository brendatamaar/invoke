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
  codeVerifier?: string;
}

export interface WebhookValidationResult {
  passed: boolean;
  error?: string;
}

export interface MockConditionRequest {
  headers: KeyValue[];
  query: URLSearchParams;
  body: string;
}

export interface MockPathMatch {
  matched: boolean;
  params: Record<string, string>;
}

export interface ServerHeaderInput {
  key: string;
  value: string;
  enabled?: boolean;
}

export interface TlsClientConfigInput {
  clientCertPem: string;
  clientKeyPem: string;
  caCertPem: string;
  serverName: string;
}

export interface ExecuteInput {
  method: string;
  url: string;
  headers: ServerHeaderInput[];
  body: string;
  bodyMode?: "none" | "json" | "form-data" | "urlencoded" | "raw" | "file";
  auth?: {
    type: string;
    username?: string;
    password?: string;
    token?: string;
    apiKeyName?: string;
    apiKeyValue?: string;
    apiKeyIn?: "header" | "query";
  };
  timeoutMs: number;
  connectTimeoutMs?: number;
  readTimeoutMs?: number;
  followRedirects: boolean;
  maxRedirects: number;
  verifySsl: boolean;
  proxy?: {
    type: "http" | "socks5";
    url: string;
    username: string;
    password: string;
  };
  tlsClientConfig?: TlsClientConfigInput;
}

export interface WebSocketConnectInput {
  url: string;
  headers: ServerHeaderInput[];
  protocols: string[];
  timeoutMs: number;
  verifySsl: boolean;
  tlsClientConfig?: TlsClientConfigInput;
}

export interface GrpcReflectInput {
  address: string;
  tls: boolean;
  timeoutMs: number;
  metadata: ServerHeaderInput[];
  verifySsl: boolean;
  tlsClientConfig?: TlsClientConfigInput;
}

export interface GrpcExecuteInput extends GrpcReflectInput {
  fullMethod: string;
  bodyJson: string;
}

export interface ProxyRequestInput {
  targetUrl: string;
  method: string;
  headers: ServerHeaderInput[];
  body: string;
}

export interface OAuth2AuthCodeStartInput {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  redirectUri: string;
  pkce: boolean;
  codeChallenge: string;
  codeChallengeMethod: string;
  codeVerifier: string;
}

export type OAuth2AuthCodePending = OAuth2PendingResult &
  OAuth2AuthCodeStartInput & {
    codeVerifier?: string;
  };
