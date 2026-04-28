export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type BodyMode = "none" | "json" | "form-data" | "urlencoded" | "raw";
export type AuthType = "none" | "basic" | "bearer" | "api-key";
export type RequestProtocol = "rest" | "graphql" | "websocket" | "grpc";
export type AssertionType = "status" | "responseTime" | "header" | "bodyJsonPath" | "bodySchema" | "regex";
export type AssertionMatcher = "equals" | "notEquals" | "exists" | "gt" | "lt" | "contains" | "matches";
export type ExtractionSource = "body" | "header" | "status";
export type DiffChangeType = "add" | "remove" | "change";

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
  assertions?: Assertion[];
  extractionRules?: ExtractionRule[];
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
  assertions?: Assertion[];
  extractionRules?: ExtractionRule[];
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
  request: ProtocolRequestConfig;
  response?: ExecuteResponse;
  assertions?: AssertionResult[];
  environmentId?: string;
  requestId?: string;
  collectionId?: string;
  protocol?: RequestProtocol;
  createdAt: number;
}

export interface ExtractionRule {
  id?: string;
  variableName: string;
  source: ExtractionSource;
  expression: string;
  fallback?: string;
  enabled?: boolean;
}

export interface Assertion {
  id: string;
  type: AssertionType;
  expression: string;
  matcher: AssertionMatcher;
  expected: string;
  enabled?: boolean;
}

export interface AssertionResult {
  assertionId: string;
  passed: boolean;
  actual?: unknown;
  expected?: unknown;
  message: string;
}

export interface DiffChange {
  type: DiffChangeType;
  path: string;
  oldValue?: unknown;
  value?: unknown;
}

export interface DiffSummary {
  additions: number;
  deletions: number;
  changes: number;
}

export interface DiffResult {
  changes: DiffChange[];
  summary: DiffSummary;
  leftText: string;
  rightText: string;
  responseTimeDeltaMs: number;
  mode: "json" | "text";
}

export interface CachedGraphQLSchema {
  endpoint: string;
  schema: GraphQLIntrospectionSchema;
  lastFetched: number;
}

export interface GraphQLIntrospectionSchema {
  queryType?: { name: string };
  mutationType?: { name: string } | null;
  subscriptionType?: { name: string } | null;
  types: GraphQLIntrospectionType[];
}

export interface GraphQLIntrospectionType {
  kind: string;
  name: string;
  description?: string | null;
  fields?: GraphQLIntrospectionField[] | null;
}

export interface GraphQLIntrospectionField {
  name: string;
  description?: string | null;
  args?: GraphQLIntrospectionInputValue[] | null;
  type: GraphQLIntrospectionTypeRef;
}

export interface GraphQLIntrospectionInputValue {
  name: string;
  description?: string | null;
  type: GraphQLIntrospectionTypeRef;
  defaultValue?: string | null;
}

export interface GraphQLIntrospectionTypeRef {
  kind: string;
  name?: string | null;
  ofType?: GraphQLIntrospectionTypeRef | null;
}
