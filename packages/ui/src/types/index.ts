import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import type {
  Assertion,
  AssertionMatcher,
  AssertionResult,
  AssertionType,
  BatchRunStats,
  CodeExportTarget,
  Collection,
  CollectionRunResult,
  DiffIgnoreRule,
  Environment,
  ExecuteResponse,
  ExtractionRule,
  ExtractionSource,
  Flow,
  FlowResult,
  Folder,
  GrpcMethodInfo,
  GrpcRequestConfig,
  GrpcStreamMessage,
  GraphQLIntrospectionSchema,
  GraphQLRequestConfig,
  HistoryEntry,
  KeyValue,
  MockLogEntry,
  MockRoute,
  RequestConfig,
  RequestDraft,
  RequestOptions,
  ResponseExample,
  RetentionSettings,
  SavedRequest,
  StoredCookie,
  TimingPhaseName,
  WebSocketRequestConfig,
} from "@invoke/core";

export type ContextTarget =
  | { type: "collection"; collection: Collection }
  | { type: "folder"; folder: Folder }
  | { type: "request"; request: SavedRequest };

export type PaletteKind =
  | "command"
  | "collection"
  | "folder"
  | "request"
  | "environment"
  | "history"
  | "flow"
  | "mock";

export type SidebarSection =
  | "collections"
  | "history"
  | "environments"
  | "flows"
  | "mocks";

export type RequestTab =
  | "params"
  | "headers"
  | "auth"
  | "body"
  | "graphql"
  | "graphqlVariables"
  | "websocket"
  | "grpc"
  | "assertions"
  | "extract"
  | "scripts"
  | "retry";

export type ResponseTab =
  | "body"
  | "headers"
  | "timing"
  | "tls"
  | "assertions"
  | "code"
  | "auth";

export interface PaletteItem {
  id: string;
  kind: PaletteKind;
  title: string;
  subtitle: string;
  keywords: string;
  method?: string;
  run: () => void | Promise<void>;
}

export interface WebSocketLogItem {
  id: string;
  direction: "sent" | "received" | "system";
  type: string;
  body: string;
  createdAt: number;
}

export interface Toast {
  id: string;
  kind: "success" | "error" | "info" | "warn";
  message: string;
}

export interface AppState {
  request: RequestDraft;
  graphqlRequest: GraphQLRequestConfig;
  websocketRequest: WebSocketRequestConfig;
  grpcRequest: GrpcRequestConfig;
  requestTab: RequestTab;
  assertionRules: Assertion[];
  extractRules: ExtractionRule[];
  scriptLogs: string[];
  response: ExecuteResponse | undefined;
  responseTab: ResponseTab;
  assertionResults: AssertionResult[];
  responsePretty: boolean;
  responseSearch: string;
  codeTarget: CodeExportTarget;
  codeSnippet: string;
  codeLoading: boolean;
  loading: boolean;
  streaming: boolean;
  streamMode: boolean;
  streamBytes: number;
  streamController: AbortController | undefined;
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  expandedFolderIds: string[];
  sidebarCollapsed: boolean;
  sidebarSection: SidebarSection;
  sidebarWidth: number;
  contextMenu: { open: boolean; x: number; y: number; target?: ContextTarget };
  environments: Environment[];
  activeEnvironmentId: string | undefined;
  sessionVariables: Record<string, string>;
  showEnvPanel: boolean;
  envDraft: Environment | undefined;
  graphqlSchema: GraphQLIntrospectionSchema | undefined;
  graphqlSchemaStatus: string;
  expandedGraphQLTypeNames: string[];
  websocketState: "disconnected" | "connecting" | "connected";
  websocketLog: WebSocketLogItem[];
  websocketConnectionId: string;
  grpcMethods: GrpcMethodInfo[];
  grpcStatus: string;
  grpcStreaming: boolean;
  grpcStreamMessages: GrpcStreamMessage[];
  grpcStreamController: AbortController | undefined;
  history: HistoryEntry[];
  historyQuery: string;
  retentionSettings: RetentionSettings | undefined;
  flows: Flow[];
  flowDraft: Flow;
  flowResult: FlowResult | undefined;
  flowRunning: boolean;
  flowLog: string[];
  diffLeftId: string;
  diffRightId: string;
  showDiffModal: boolean;
  diffIgnoreRules: DiffIgnoreRule[];
  responseExamples: ResponseExample[];
  mockRoutes: MockRoute[];
  mockLogs: MockLogEntry[];
  mockStatus: string;
  variableEditor: {
    open: boolean;
    kind?: "collection" | "folder";
    id?: string;
    name: string;
    variables: KeyValue[];
  };
  showCollectionRunner: boolean;
  collectionRunnerTarget: {
    type: "collection" | "folder";
    id: string;
    name: string;
  } | null;
  collectionRunResult: CollectionRunResult | null;
  collectionRunning: boolean;
  showBatchRunner: boolean;
  batchRunResult: BatchRunStats | null;
  batchRunning: boolean;
  cookies: StoredCookie[];
  enableCookies: boolean;
  showCookieManager: boolean;
  resolvedRequest: RequestConfig | undefined;
  saveDialog: {
    open: boolean;
    name: string;
    collectionId: string;
    folderId: string;
  };
  showSettings: boolean;
  showHelp: boolean;
  showClearHistoryModal: boolean;
  uiFontSize: number;
  commandPaletteOpen: boolean;
  commandQuery: string;
  toasts: Toast[];
  set: (
    partial: Partial<AppState> | ((s: AppState) => Partial<AppState>),
  ) => void;
  setRequest: (partial: Partial<RequestDraft>) => void;
  setGraphqlRequest: (partial: Partial<GraphQLRequestConfig>) => void;
  setWebsocketRequest: (partial: Partial<WebSocketRequestConfig>) => void;
  setGrpcRequest: (partial: Partial<GrpcRequestConfig>) => void;
  addToast: (kind: Toast["kind"], message: string) => void;
  removeToast: (id: string) => void;
  toggleFolder: (id: string) => void;
  resetRequest: () => void;
}

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

export interface AssertionDraft {
  type: AssertionType;
  expression: string;
  matcher: AssertionMatcher;
  expected: string;
}

export interface ExtractionDraft {
  variableName: string;
  source: ExtractionSource;
  expression: string;
}

export interface PhaseBar {
  name: TimingPhaseName;
  label: string;
  color: string;
  startMs: number;
  durationMs: number;
  leftPct: number;
  widthPct: number;
}

export interface URLBarProps {
  onSend: () => void;
  loading: boolean;
}

export interface RequestBuilderProps {
  onSend: () => void;
}

export interface AuthTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
}

export interface FieldProps {
  label: string;
  children: ReactNode;
}

export type GraphQLSchemaImportSource = "url" | "file";

export type CodeEditorLang = "json" | "javascript" | "xml" | "python" | "text";

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  lang?: CodeEditorLang;
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
}

export interface SettingsDraft {
  theme: string;
  timeoutMs: number;
  options: RequestOptions;
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  footer?: ReactNode;
}

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export interface PromptModalProps {
  open: boolean;
  title: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  multiline?: boolean;
  confirmLabel?: string;
  allowEmpty?: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export interface KeyValueEditorProps {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
  variableAutocomplete?: boolean;
}

export interface MethodBadgeProps {
  method: string;
  size?: "sm" | "md";
}

export type SelectSize = "2xs" | "xs" | "sm";

export interface SelectOptionItem {
  value: string;
  label: ReactNode;
}

export interface SelectSizeClasses {
  trigger: string;
  item: string;
  chevron: number;
}

export interface SelectProps {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  size?: SelectSize;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export interface StatusBadgeProps {
  status: number;
}

export interface VariableAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  spellCheck?: boolean;
  disabled?: boolean;
  type?: "text" | "password";
}

export interface VariableSuggestion {
  name: string;
  source: "environment" | "session" | "dynamic";
  value?: string;
  sensitive?: boolean;
}

export type RouteTab = "response" | "sequences" | "headers";

export interface WebhookEndpoint {
  id: string;
  label: string;
  validation: WebhookValidationConfig;
}

export interface CollectionImportResult {
  collection: Collection;
  folders?: Folder[];
  requests: SavedRequest[];
  environments?: unknown[];
}
