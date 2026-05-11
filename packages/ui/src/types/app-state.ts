import type {
  Assertion,
  AssertionResult,
  BatchRunStats,
  CodeExportTarget,
  Collection,
  CollectionRunResult,
  DiffIgnoreRule,
  Environment,
  ExecuteResponse,
  ExtractionRule,
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
  ResponseExample,
  RetentionSettings,
  SavedRequest,
  StoredCookie,
  WebSocketRequestConfig,
} from "@invoke/core";
import type { ContextTarget, SidebarSection } from "./navigation";
import type { RequestTab } from "./request";
import type { ResponseTab } from "./response";

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
  loadController: AbortController | undefined;
  retryAttempts: number | undefined;
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
  showPassphraseModal: boolean;
  passphraseMode: "setup" | "unlock";
  passphraseCallback: ((passphrase: string | null) => void) | null;
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
