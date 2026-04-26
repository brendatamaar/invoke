export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type BodyMode = "none" | "json" | "form-data" | "urlencoded" | "raw";
export type AuthType = "none" | "basic" | "bearer" | "api-key";

export interface KeyValue {
  id?: string;
  key: string;
  value: string;
  enabled?: boolean;
  sensitive?: boolean;
}

export interface AuthConfig {
  type: AuthType;
  username?: string;
  password?: string;
  token?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyIn?: "header" | "query";
}

export interface RequestConfig {
  id?: string;
  collectionId?: string;
  name?: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  bodyMode: BodyMode;
  body: string;
  auth: AuthConfig;
  timeoutMs: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SavedRequest extends RequestConfig {
  id: string;
  collectionId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
  createdAt: number;
  updatedAt: number;
}

export interface Timing {
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
  ttfbMs: number;
  transferMs: number;
  totalMs: number;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  dnsNames: string[];
  serialNumber: string;
  sha256Fingerprint: string;
}

export interface TlsInfo {
  version: string;
  cipherSuite: string;
  certificates: CertificateInfo[];
}

export interface ExecuteResponse {
  status: number;
  statusText: string;
  headers: KeyValue[];
  body: string;
  bodyEncoding?: "utf8" | "base64";
  timing: Timing;
  tls?: TlsInfo;
  redirects?: Array<{ url: string; status: number; headers: KeyValue[] }>;
  requestSize: number;
  responseSize: number;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  request: RequestConfig;
  response?: ExecuteResponse;
  environmentId?: string;
  createdAt: number;
}

export interface ExtractionRule {
  name: string;
  jsonPath: string;
}
