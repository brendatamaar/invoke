export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export type BodyMode = "none" | "json" | "form-data" | "urlencoded" | "raw";
export type AuthType = "none" | "basic" | "bearer" | "api-key" | "oauth2" | "digest" | "aws-sigv4";
export type RequestProtocol = "rest" | "graphql" | "websocket" | "grpc";
export type AssertionType = "status" | "responseTime" | "header" | "bodyJsonPath" | "bodySchema" | "regex";
export type AssertionMatcher = "equals" | "notEquals" | "exists" | "gt" | "lt" | "contains" | "matches";
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
}

export interface AuthConfig {
  type: AuthType;
  username?: string;
  password?: string;
  token?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyIn?: "header" | "query";
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  awsService?: string;
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
  scripts?: RequestScripts;
}

export interface RequestOptions {
  followRedirects?: boolean;
  maxRedirects?: number;
  verifySsl?: boolean;
  tlsClientConfig?: TlsClientConfig;
  proxy?: {
    type: "http" | "socks5";
    url: string;
    username?: string;
    password?: string;
  };
}

export interface TlsClientConfig {
  clientCertPem?: string;
  clientKeyPem?: string;
  caCertPem?: string;
  serverName?: string;
}

export interface RequestScripts {
  preRequest?: string;
  postResponse?: string;
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

export interface ScriptExecutionResult<TRequest extends ProtocolRequestConfig = ProtocolRequestConfig> {
  request: TRequest;
  variables: Record<string, string>;
  logs: string[];
  skipped?: boolean;
  skipReason?: string;
}

export interface Flow {
  id: string;
  name: string;
  steps: FlowStep[];
  createdAt: number;
  updatedAt: number;
}

export type FlowStep = FlowRequestStep | FlowDelayStep | FlowConditionStep | FlowLoopStep;

export interface FlowRequestStep {
  id: string;
  type: "request";
  name: string;
  request: RequestConfig;
  continueOnFailure?: boolean;
}

export interface FlowDelayStep {
  id: string;
  type: "delay";
  name: string;
  delayMs: number;
}

export interface FlowCondition {
  source: "variable" | "status" | "bodyJsonPath" | "header";
  expression: string;
  matcher: AssertionMatcher;
  expected: string;
}

export interface FlowConditionStep {
  id: string;
  type: "condition";
  name: string;
  condition: FlowCondition;
  thenSteps: FlowStep[];
  elseSteps?: FlowStep[];
}

export interface FlowLoopStep {
  id: string;
  type: "loop";
  name: string;
  count?: number;
  condition?: FlowCondition;
  conditionMode?: "while" | "until";
  steps: FlowStep[];
  maxIterations?: number;
}

export interface FlowStepResult {
  stepId: string;
  name: string;
  type: FlowStepType;
  status: FlowStatus;
  startedAt: number;
  completedAt: number;
  response?: ExecuteResponse;
  assertions?: AssertionResult[];
  error?: string;
}

export interface FlowResult {
  flowId: string;
  status: FlowStatus;
  startedAt: number;
  completedAt: number;
  variables: Record<string, string>;
  steps: FlowStepResult[];
}

export interface MockCondition {
  source: MockConditionSource;
  expression: string;
  matcher: AssertionMatcher;
  expected: string;
}

export interface MockRoute {
  id: string;
  enabled?: boolean;
  method: HttpMethod;
  pathPattern: string;
  status: number;
  headers: KeyValue[];
  body: string;
  latencyMs?: number;
  conditions?: MockCondition[];
}

export interface MockLogEntry {
  id: string;
  routeId?: string;
  matched: boolean;
  method: string;
  path: string;
  status: number;
  headers: KeyValue[];
  body: string;
  createdAt: number;
}
