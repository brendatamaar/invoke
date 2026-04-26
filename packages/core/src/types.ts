export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type BodyMode = "none" | "json" | "form-data" | "urlencoded" | "raw";
export type AuthType = "none" | "basic" | "bearer" | "api-key";
export type RequestProtocol = "rest" | "graphql" | "websocket" | "grpc";

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
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  bodyMode: BodyMode;
  body: string;
  auth: AuthConfig;
  timeoutMs: number;
  variables?: KeyValue[];
  options?: RequestOptions;
}

export interface RequestOptions {
  followRedirects?: boolean;
  maxRedirects?: number;
  verifySsl?: boolean;
  proxy?: {
    type: "http" | "socks5";
    url: string;
    username?: string;
    password?: string;
  };
}

export interface GraphQLRequestConfig {
  url: string;
  headers: KeyValue[];
  auth: AuthConfig;
  query: string;
  variables: string;
  operationName?: string;
  timeoutMs: number;
  options?: RequestOptions;
}

export type ProtocolRequestConfig = RequestConfig | GraphQLRequestConfig;

export interface RequestDraft extends RequestConfig {
  id?: string;
  collectionId?: string;
  folderId?: string | null;
  name?: string;
  protocol?: RequestProtocol;
  sortOrder?: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  variables?: KeyValue[];
  sortOrder?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  collectionId: string;
  parentFolderId?: string | null;
  name: string;
  description?: string;
  variables?: KeyValue[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface SavedRequest {
  id: string;
  collectionId: string;
  folderId?: string | null;
  name: string;
  protocol: RequestProtocol;
  request: ProtocolRequestConfig;
  sortOrder: number;
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

export type TimingPhaseName = "dns" | "tcp" | "tls" | "ttfb" | "transfer";

export interface TimingPhase {
  name: TimingPhaseName;
  startMs: number;
  durationMs: number;
}

export interface TimingAttempt {
  url: string;
  status?: number;
  headers: KeyValue[];
  timing: Timing;
  phases: TimingPhase[];
  redirect: boolean;
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
  attempts?: TimingAttempt[];
  tls?: TlsInfo;
  redirects?: Array<{ url: string; status: number; headers: KeyValue[]; timing?: Timing; phases?: TimingPhase[] }>;
  requestSize: number;
  responseSize: number;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  request: RequestConfig;
  response?: ExecuteResponse;
  environmentId?: string;
  requestId?: string;
  collectionId?: string;
  protocol?: RequestProtocol;
  createdAt: number;
}

export interface ExtractionRule {
  name: string;
  jsonPath: string;
}
