import type {
  Assertion,
  AssertionResult,
  BatchRunStats,
  CodeExportTarget,
  CollectionRunResult,
  DefaultProtocolOptions,
  Environment,
  ExecuteResponse,
  ExtractionRule,
  Flow,
  FlowResult,
  GrpcExecuteResponse,
  GrpcMethodInfo,
  GrpcRequestConfig,
  GrpcStreamMessage,
  GraphQLIntrospectionSchema,
  GraphQLRequestConfig,
  KeyValue,
  MockLogEntry,
  RequestConfig,
  RequestDraft,
  SavedRequest,
  WebSocketRequestConfig,
} from "@invoke/core";
import type { ContextTarget } from "./navigation";
import type { RequestTab } from "./request";
import type { ResponseTab } from "./response";
import type { SettingsTab } from "./settings";

export interface WebSocketLogItem {
  id: string;
  direction: "sent" | "received" | "system";
  type: string;
  body: string;
  createdAt: number;
}

export interface WsSession {
  id: string;
  connectionId: string;
  state: "disconnected" | "connecting" | "connected";
  log: WebSocketLogItem[];
  label: string;
  latencyMs?: number;
  lastActivityAt?: number;
}

export interface Toast {
  id: string;
  kind: "success" | "error" | "info" | "warn";
  message: string;
}

export interface GraphQLFileUpload {
  id: string;
  varPath: string;
  dataUrl: string;
  filename: string;
  mimeType: string;
}

export interface GraphQLDeferredPart {
  partIndex: number;
  path?: (string | number)[];
  data?: unknown;
  errors?: unknown[];
  hasNext: boolean;
  label?: string;
}

export interface AppState {
  request: RequestDraft;
  graphqlRequest: GraphQLRequestConfig;
  websocketRequest: WebSocketRequestConfig;
  grpcRequest: GrpcRequestConfig;
  requestTab: RequestTab;
  assertionRules: Assertion[];
  extractRules: ExtractionRule[];
  consoleLogs: {
    preRequest: string[];
    preRequestError?: string;
    preRequestRan: boolean;
    postResponse: string[];
    postResponseError?: string;
    postResponseRan: boolean;
  };
  response: ExecuteResponse | undefined;
  responseTab: ResponseTab;
  assertionResults: AssertionResult[];
  responsePretty: boolean;
  responseSearch: string;
  codeTarget: CodeExportTarget;
  codeSnippet: string;
  codeLoading: boolean;
  loading: boolean;
  loadController: AbortController | undefined;
  retryAttempts: number | undefined;
  streaming: boolean;
  streamMode: boolean;
  streamBytes: number;
  streamController: AbortController | undefined;
  requests: SavedRequest[];
  protocolDefaults: DefaultProtocolOptions;
  expandedFolderIds: string[];
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  contextMenu: { open: boolean; x: number; y: number; target?: ContextTarget };
  environments: Environment[];
  activeEnvironmentId: string | undefined;
  sessionVariables: Record<string, string>;
  showEnvPanel: boolean;
  envDraft: Environment | undefined;
  graphqlFileUploads: GraphQLFileUpload[];
  graphqlDeferredParts: GraphQLDeferredPart[] | null;
  graphqlSchema: GraphQLIntrospectionSchema | undefined;
  graphqlSchemaStatus: string;
  graphqlSchemaEndpoint: string;
  graphqlSchemaLastFetched: number;
  expandedGraphQLTypeNames: string[];
  wsSessions: WsSession[];
  activeWsSessionId: string;
  grpcMethods: GrpcMethodInfo[];
  grpcStatus: string;
  grpcStreaming: boolean;
  grpcStreamMessages: GrpcStreamMessage[];
  grpcStreamController: AbortController | undefined;
  grpcResponse: GrpcExecuteResponse | undefined;
  grpcExecuteController: AbortController | undefined;
  grpcAssertionResults: AssertionResult[];
  grpcStreamId: string | undefined;
  grpcStreamSentMessages: string[];
  grpcStreamReceivedMessages: GrpcStreamMessage[];
  grpcLatencyMs: number | undefined;
  grpcDeadlineEnd: number | undefined;
  historyQuery: string;
  flowDraft: Flow;
  flowResult: FlowResult | undefined;
  flowRunning: boolean;
  flowLog: string[];
  diffLeftId: string;
  diffRightId: string;
  showDiffModal: boolean;
  mockLogs: MockLogEntry[];
  mockTotalLogs: number;
  mockStatus: string;
  proxyRecordsTick: number;
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
  settingsTab: SettingsTab | undefined;
  showHelp: boolean;
  showClearHistoryModal: boolean;
  showPassphraseModal: boolean;
  passphraseMode: "setup" | "unlock";
  passphraseCallback: ((passphrase: string | null) => void) | null;
  uiFontSize: number;
  editorWordWrap: boolean;
  showSaveActionModal: boolean;
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
  setWsSession: (id: string, partial: Partial<Omit<WsSession, "id">>) => void;
  addWsSession: () => string;
  closeWsSession: (id: string) => void;
  addToast: (kind: Toast["kind"], message: string) => void;
  removeToast: (id: string) => void;
  toggleFolder: (id: string) => void;
  resetRequest: () => void;
}
