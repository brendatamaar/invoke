import {
  emptyGrpcRequest,
  emptyGraphQLRequest,
  emptyWebSocketRequest,
  emptyRequest,
  InvokeStore as CoreStore,
  type Assertion,
  type AssertionResult,
  type Collection,
  type Environment,
  type ExecuteResponse,
  type ExtractionRule,
  type Flow,
  type FlowResult,
  type Folder,
  type GrpcMethodInfo,
  type GrpcRequestConfig,
  type GraphQLIntrospectionSchema,
  type GraphQLRequestConfig,
  type HistoryEntry,
  type KeyValue,
  type MockLogEntry,
  type MockRoute,
  type RequestDraft,
  type SavedRequest,
  type WebSocketRequestConfig,
  type CodeExportTarget
} from "@invoke/core";
import { create } from "zustand";
import type {
  ContextTarget,
  RequestTab,
  ResponseTab,
  SidebarSection,
  Toast,
  WebSocketLogItem
} from "../lib/types";

export const coreStore = new CoreStore();

interface AppState {
  // ── Request ──────────────────────────────────────────────
  request: RequestDraft;
  graphqlRequest: GraphQLRequestConfig;
  websocketRequest: WebSocketRequestConfig;
  grpcRequest: GrpcRequestConfig;
  requestTab: RequestTab;
  assertionRules: Assertion[];
  extractRules: ExtractionRule[];
  scriptLogs: string[];

  // ── Response ─────────────────────────────────────────────
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

  // ── Collections / sidebar ─────────────────────────────────
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
  expandedFolderIds: string[];
  sidebarCollapsed: boolean;
  sidebarSection: SidebarSection;
  sidebarWidth: number;
  contextMenu: { open: boolean; x: number; y: number; target?: ContextTarget };

  // ── Environments ─────────────────────────────────────────
  environments: Environment[];
  activeEnvironmentId: string | undefined;
  sessionVariables: Record<string, string>;
  showEnvPanel: boolean;
  envDraft: Environment | undefined;

  // ── GraphQL ───────────────────────────────────────────────
  graphqlSchema: GraphQLIntrospectionSchema | undefined;
  graphqlSchemaStatus: string;
  expandedGraphQLTypeNames: string[];

  // ── WebSocket ─────────────────────────────────────────────
  websocketState: "disconnected" | "connecting" | "connected";
  websocketLog: WebSocketLogItem[];
  websocketConnectionId: string;

  // ── gRPC ─────────────────────────────────────────────────
  grpcMethods: GrpcMethodInfo[];
  grpcStatus: string;

  // ── History ───────────────────────────────────────────────
  history: HistoryEntry[];
  historyQuery: string;

  // ── Flows ─────────────────────────────────────────────────
  flows: Flow[];
  flowDraft: Flow;
  flowResult: FlowResult | undefined;
  flowRunning: boolean;
  flowLog: string[];

  // ── Diff ─────────────────────────────────────────────────
  diffLeftId: string;
  diffRightId: string;
  showDiffModal: boolean;

  // ── Mock server ───────────────────────────────────────────
  mockRoutes: MockRoute[];
  mockLogs: MockLogEntry[];
  mockStatus: string;

  // ── Variable editor ───────────────────────────────────────
  variableEditor: {
    open: boolean;
    kind?: "collection" | "folder";
    id?: string;
    name: string;
    variables: KeyValue[];
  };

  // ── Dialogs ───────────────────────────────────────────────
  saveDialog: { open: boolean; name: string; collectionId: string; folderId: string };
  showSettings: boolean;
  showHelp: boolean;
  showClearHistoryModal: boolean;
  uiFontSize: number;
  commandPaletteOpen: boolean;
  commandQuery: string;

  // ── Toasts ───────────────────────────────────────────────
  toasts: Toast[];

  // ── Actions ──────────────────────────────────────────────
  set: (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
  setRequest: (partial: Partial<RequestDraft>) => void;
  setGraphqlRequest: (partial: Partial<GraphQLRequestConfig>) => void;
  setWebsocketRequest: (partial: Partial<WebSocketRequestConfig>) => void;
  setGrpcRequest: (partial: Partial<GrpcRequestConfig>) => void;
  addToast: (kind: Toast["kind"], message: string) => void;
  removeToast: (id: string) => void;
  toggleFolder: (id: string) => void;
  resetRequest: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // ── Request ──────────────────────────────────────────────
  request: emptyRequest(),
  graphqlRequest: emptyGraphQLRequest(),
  websocketRequest: emptyWebSocketRequest(),
  grpcRequest: emptyGrpcRequest(),
  requestTab: "params",
  assertionRules: [],
  extractRules: [],
  scriptLogs: [],

  // ── Response ─────────────────────────────────────────────
  response: undefined,
  responseTab: "body",
  assertionResults: [],
  responsePretty: true,
  responseSearch: "",
  codeTarget: "curl",
  codeSnippet: "",
  codeLoading: false,
  loading: false,
  streaming: false,
  streamMode: false,
  streamBytes: 0,
  streamController: undefined,

  // ── Collections ───────────────────────────────────────────
  collections: [],
  folders: [],
  requests: [],
  expandedFolderIds: [],
  sidebarCollapsed: false,
  sidebarSection: "collections",
  sidebarWidth: 260,
  contextMenu: { open: false, x: 0, y: 0 },

  // ── Environments ─────────────────────────────────────────
  environments: [],
  activeEnvironmentId: undefined,
  sessionVariables: {},
  showEnvPanel: false,
  envDraft: undefined,

  // ── GraphQL ───────────────────────────────────────────────
  graphqlSchema: undefined,
  graphqlSchemaStatus: "",
  expandedGraphQLTypeNames: [],

  // ── WebSocket ─────────────────────────────────────────────
  websocketState: "disconnected",
  websocketLog: [],
  websocketConnectionId: "",

  // ── gRPC ─────────────────────────────────────────────────
  grpcMethods: [],
  grpcStatus: "",

  // ── History ───────────────────────────────────────────────
  history: [],
  historyQuery: "",

  // ── Flows ─────────────────────────────────────────────────
  flows: [],
  flowDraft: { id: "", name: "New Flow", steps: [] } as unknown as Flow,
  flowResult: undefined,
  flowRunning: false,
  flowLog: [],

  // ── Diff ─────────────────────────────────────────────────
  diffLeftId: "",
  diffRightId: "",
  showDiffModal: false,

  // ── Mock server ───────────────────────────────────────────
  mockRoutes: [],
  mockLogs: [],
  mockStatus: "",

  // ── Variable editor ───────────────────────────────────────
  variableEditor: { open: false, name: "", variables: [] },

  // ── Dialogs ───────────────────────────────────────────────
  saveDialog: { open: false, name: "", collectionId: "", folderId: "" },
  showSettings: false,
  showHelp: false,
  showClearHistoryModal: false,
  uiFontSize: Number(localStorage.getItem("uiFontSize") ?? 13),
  commandPaletteOpen: false,
  commandQuery: "",

  // ── Toasts ───────────────────────────────────────────────
  toasts: [],

  // ── Actions ──────────────────────────────────────────────
  set: (partial) => {
    if (typeof partial === "function") set((s) => (partial as (s: AppState) => Partial<AppState>)(s));
    else set(partial);
  },

  setRequest: (partial) =>
    set((s) => ({ request: { ...s.request, ...partial } })),

  setGraphqlRequest: (partial) =>
    set((s) => ({ graphqlRequest: { ...s.graphqlRequest, ...partial } })),

  setWebsocketRequest: (partial) =>
    set((s) => ({ websocketRequest: { ...s.websocketRequest, ...partial } })),

  setGrpcRequest: (partial) =>
    set((s) => ({ grpcRequest: { ...s.grpcRequest, ...partial } })),

  addToast: (kind, message) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  toggleFolder: (id) =>
    set((s) => ({
      expandedFolderIds: s.expandedFolderIds.includes(id)
        ? s.expandedFolderIds.filter((x) => x !== id)
        : [...s.expandedFolderIds, id]
    })),

  resetRequest: () =>
    set({
      request: emptyRequest(),
      response: undefined,
      assertionResults: [],
      scriptLogs: [],
      requestTab: "params",
      responseTab: "body"
    })
}));
