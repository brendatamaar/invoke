import {
  emptyGrpcRequest,
  emptyGraphQLRequest,
  emptyWebSocketRequest,
  emptyRequest,
  InvokeStore as CoreStore,
} from "@invoke/core";
import { create } from "zustand";
import type { AppState } from "../types";

export const coreStore = new CoreStore();

export const useStore = create<AppState>((set, get) => ({
  // Request
  request: emptyRequest(),
  graphqlRequest: emptyGraphQLRequest(),
  websocketRequest: emptyWebSocketRequest(),
  grpcRequest: emptyGrpcRequest(),
  requestTab: "params",
  assertionRules: [],
  extractRules: [],
  scriptLogs: [],

  // Response
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

  // Collections
  collections: [],
  folders: [],
  requests: [],
  expandedFolderIds: [],
  sidebarCollapsed: false,
  sidebarSection: "collections",
  sidebarWidth: 260,
  contextMenu: { open: false, x: 0, y: 0 },

  // Environments
  environments: [],
  activeEnvironmentId: undefined,
  sessionVariables: {},
  showEnvPanel: false,
  envDraft: undefined,

  // GraphQL
  graphqlSchema: undefined,
  graphqlSchemaStatus: "",
  expandedGraphQLTypeNames: [],

  // WebSocket
  websocketState: "disconnected",
  websocketLog: [],
  websocketConnectionId: "",

  // gRPC
  grpcMethods: [],
  grpcStatus: "",
  grpcStreaming: false,
  grpcStreamMessages: [],
  grpcStreamController: undefined,

  // History
  history: [],
  historyQuery: "",
  retentionSettings: undefined,

  // Flows
  flows: [],
  flowDraft: {
    id: "",
    name: "New Flow",
    steps: [],
  } as unknown as AppState["flowDraft"],
  flowResult: undefined,
  flowRunning: false,
  flowLog: [],

  // Diff
  diffLeftId: "",
  diffRightId: "",
  showDiffModal: false,
  diffIgnoreRules: [],

  // Response examples
  responseExamples: [],

  // Mock server
  mockRoutes: [],
  mockLogs: [],
  mockStatus: "",

  // Variable editor
  variableEditor: { open: false, name: "", variables: [] },

  // Collection runner
  showCollectionRunner: false,
  collectionRunnerTarget: null,
  collectionRunResult: null,
  collectionRunning: false,

  // Batch runner
  showBatchRunner: false,
  batchRunResult: null,
  batchRunning: false,

  // Cookies
  cookies: [],
  enableCookies: true,
  showCookieManager: false,

  // Last resolved request
  resolvedRequest: undefined,

  // Dialogs
  saveDialog: { open: false, name: "", collectionId: "", folderId: "" },
  showSettings: false,
  showHelp: false,
  showClearHistoryModal: false,
  uiFontSize: Number(localStorage.getItem("uiFontSize") ?? 13),
  commandPaletteOpen: false,
  commandQuery: "",

  // Toasts
  toasts: [],

  // Actions
  set: (partial) => {
    if (typeof partial === "function")
      set((s) => (partial as (s: AppState) => Partial<AppState>)(s));
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
        : [...s.expandedFolderIds, id],
    })),

  resetRequest: () =>
    set({
      request: emptyRequest(),
      response: undefined,
      assertionResults: [],
      scriptLogs: [],
      requestTab: "params",
      responseTab: "body",
    }),
}));
