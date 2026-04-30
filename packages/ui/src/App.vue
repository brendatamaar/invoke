<script setup lang="ts">
import {
  CODE_EXPORT_TARGETS,
  compareResponses,
  emptyGrpcRequest,
  emptyGraphQLRequest,
  emptyWebSocketRequest,
  emptyRequest,
  exportCollectionZip,
  extractVariables,
  formatGraphQLTypeRef,
  FlowRunner,
  generateCodeSnippet,
  graphQLFieldSnippet,
  GRAPHQL_INTROSPECTION_QUERY,
  importHoppscotchCollection,
  importInsomniaExport,
  graphQLToRequestConfig,
  importOpenApiSpec,
  importPostmanCollection,
  importYamlFiles,
  InvokeStore,
  parseCurl,
  parseGraphQLIntrospection,
  prettyBody,
  publicGraphQLTypes,
  normalizeExtractionRules,
  resolveGraphQLRequest,
  resolveGrpcRequest,
  resolveRequest,
  resolveWebSocketRequest,
  rootGraphQLTypes,
  runPostResponseScript,
  runPreRequestScript,
  runAssertions,
  searchHistory,
  signAwsSigV4Request,
  toRequestConfig,
  variablesFromScopes,
  type Assertion,
  type AssertionResult,
  type AuthConfig,
  type BodyMode,
  type DiffResult,
  type CodeExportTarget,
  type Collection,
  type Environment,
  type ExecuteResponse,
  type ExtractionRule,
  type Folder,
  type Flow,
  type FlowResult,
  type GrpcMethodInfo,
  type GrpcRequestConfig,
  type GraphQLRequestConfig,
  type GraphQLIntrospectionField,
  type GraphQLIntrospectionSchema,
  type GraphQLIntrospectionType,
  type HistoryEntry,
  type HttpMethod,
  type KeyValue,
  type MockLogEntry,
  type MockRoute,
  type ProtocolRequestConfig,
  type RequestConfig,
  type RequestDraft,
  type RequestProtocol,
  type SavedRequest,
  type WebSocketRequestConfig
} from "@invoke/core";
import Fuse from "fuse.js";
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import {
  clearMockLogs,
  execute,
  executeStream,
  grpcExecute,
  grpcReflect,
  loadMockRoutes,
  oauth2ClientCredentials,
  ping,
  syncMockRoutes,
  webSocketClose,
  webSocketConnect,
  webSocketPoll,
  webSocketSend
} from "./lib/api";
import FolderTreeNode from "./components/FolderTreeNode.vue";
import GraphQLEditor from "./components/GraphQLEditor.vue";
import KeyValueEditor from "./components/KeyValueEditor.vue";
import TimingWaterfall from "./components/TimingWaterfall.vue";
import type { ContextTarget, FolderTreeNodeView, PaletteItem, SidebarSection, TreeDragPayload, WebSocketLogItem } from "./types";

const store = new InvokeStore();
const CodeViewer = defineAsyncComponent(() => import("./components/CodeViewer.vue"));

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const bodyModes: BodyMode[] = ["none", "json", "form-data", "urlencoded", "raw"];
const authTypes: AuthConfig["type"][] = ["none", "basic", "bearer", "api-key", "oauth2", "digest", "aws-sigv4"];
const protocols: RequestProtocol[] = ["rest", "graphql", "websocket", "grpc"];
const assertionTypes: Assertion["type"][] = ["status", "responseTime", "header", "bodyJsonPath", "bodySchema", "regex"];
const assertionMatchers: Assertion["matcher"][] = ["equals", "notEquals", "exists", "gt", "lt", "contains", "matches"];
const extractionSources: NonNullable<ExtractionRule["source"]>[] = ["body", "header", "status"];

const request = ref<RequestDraft>(emptyRequest());
const graphqlRequest = ref<GraphQLRequestConfig>(emptyGraphQLRequest());
const websocketRequest = ref<WebSocketRequestConfig>(emptyWebSocketRequest());
const grpcRequest = ref<GrpcRequestConfig>(emptyGrpcRequest());
const collections = ref<Collection[]>([]);
const folders = ref<Folder[]>([]);
const requests = ref<SavedRequest[]>([]);
const environments = ref<Environment[]>([]);
const activeEnvironmentId = ref<string | undefined>();
const history = ref<HistoryEntry[]>([]);
const response = ref<ExecuteResponse | undefined>();
const assertionRules = ref<Assertion[]>([]);
const assertionResults = ref<AssertionResult[]>([]);
const selectedTab = ref<"params" | "headers" | "auth" | "body" | "graphql" | "graphqlVariables" | "websocket" | "grpc" | "assertions" | "extract" | "scripts">("params");
const responseTab = ref<"body" | "headers" | "timing" | "tls" | "assertions" | "code">("body");
const loading = ref(false);
const streaming = ref(false);
const streamMode = ref(false);
const streamBytes = ref(0);
const streamController = ref<AbortController | undefined>();
const status = ref("Ready");
const importPreview = reactive({ message: "", error: "" });
const codeTarget = ref<CodeExportTarget>("curl");
const codeSnippet = ref("");
const codeLoading = ref(false);
const historyQuery = ref("");
const debouncedHistoryQuery = ref("");
const commandQuery = ref("");
const commandPaletteOpen = ref(false);
const selectedCommandIndex = ref(0);
const commandInput = ref<HTMLInputElement>();
const showHelp = ref(false);
const showSettings = ref(false);
const sidebarCollapsed = ref(false);
const activeSideSection = ref<SidebarSection>("collections");
const openApiFileInput = ref<HTMLInputElement>();
const postmanFileInput = ref<HTMLInputElement>();
const invokeFileInput = ref<HTMLInputElement>();
const insomniaFileInput = ref<HTMLInputElement>();
const hoppscotchFileInput = ref<HTMLInputElement>();
const theme = ref(localStorage.getItem("theme") ?? "dark");
const uiFontSize = ref(Number(localStorage.getItem("uiFontSize") ?? 13));
const showEnvPanel = ref(false);
const envDraft = ref<Environment | undefined>();
const saveDialog = reactive({ open: false, name: "", collectionId: "", folderId: "" });
const extractRules = ref<ExtractionRule[]>([]);
const sessionVariables = ref<Record<string, string>>({});
const showExtractTab = true;
const scriptLogs = ref<string[]>([]);
const websocketState = ref<"disconnected" | "connecting" | "connected">("disconnected");
const websocketLog = ref<WebSocketLogItem[]>([]);
const websocketConnectionId = ref("");
const grpcMethods = ref<GrpcMethodInfo[]>([]);
const grpcStatus = ref("");
const mockRoutes = ref<MockRoute[]>([]);
const mockLogs = ref<MockLogEntry[]>([]);
const mockStatus = ref("");
const flows = ref<Flow[]>([]);
const flowDraft = ref<Flow>(emptyFlow());
const flowResult = ref<FlowResult | undefined>();
const flowRunning = ref(false);
const flowLog = ref<string[]>([]);
const diffLeftId = ref("");
const diffRightId = ref("");
const diffResult = ref<DiffResult | undefined>();
const showDiffModal = ref(false);
const responsePretty = ref(true);
const responseSearch = ref("");
const graphqlSchema = ref<GraphQLIntrospectionSchema | undefined>();
const graphqlSchemaStatus = ref("");
const expandedGraphQLTypeNames = ref<string[]>([]);
const gqlEditor = ref<{ insertText: (value: string) => void }>();
const expandedFolderIds = ref<string[]>([]);
const treeDrag = ref<TreeDragPayload | undefined>();
const contextMenu = reactive<{ open: boolean; x: number; y: number; target?: ContextTarget }>({
  open: false,
  x: 0,
  y: 0
});
let historySearchTimer: ReturnType<typeof setTimeout> | undefined;
let websocketPollTimer: ReturnType<typeof setInterval> | undefined;
let codeGenerationRun = 0;
const oauth2TokenCache = new Map<string, { token: string; expiresAt: number }>();
const variableEditor = reactive<{
  open: boolean;
  kind?: "collection" | "folder";
  id?: string;
  name: string;
  variables: KeyValue[];
}>({
  open: false,
  name: "",
  variables: []
});

function activeProtocolTarget(): { options?: RequestConfig["options"] } {
  if (activeProtocol.value === "graphql") return graphqlRequest.value;
  if (activeProtocol.value === "websocket") return websocketRequest.value;
  if (activeProtocol.value === "grpc") return grpcRequest.value;
  return request.value;
}

function ensureRequestOptions(target: { options?: RequestConfig["options"] }): NonNullable<RequestConfig["options"]> {
  target.options = {
    followRedirects: target.options?.followRedirects ?? true,
    maxRedirects: target.options?.maxRedirects ?? 10,
    verifySsl: target.options?.verifySsl ?? true,
    proxy: target.options?.proxy,
    tlsClientConfig: { ...(target.options?.tlsClientConfig ?? {}) }
  };
  return target.options;
}

const activeEnvironment = computed(() => environments.value.find((env) => env.id === activeEnvironmentId.value));
const groupedRequests = computed(() =>
  collections.value.map((collection) => ({
    collection,
    folders: buildFolderTree(collection.id),
    requests: sortedRequests(requests.value.filter((item) => item.collectionId === collection.id && !item.folderId))
  }))
);
const activeCollection = computed(() => collections.value.find((collection) => collection.id === request.value.collectionId));
const activeFolderChain = computed(() => folderChain(request.value.folderId));
const activeProtocol = computed(() => request.value.protocol ?? "rest");
const activeOptions = computed(() => ensureRequestOptions(activeProtocolTarget()));
const activeAuthTypes = computed(() =>
  activeProtocol.value === "websocket" ? authTypes.filter((type) => type !== "digest" && type !== "aws-sigv4") : authTypes
);
const resolutionScopes = computed(() => [
  { name: "environment", variables: activeEnvironment.value?.variables ?? [] },
  { name: "collection", variables: activeCollection.value?.variables ?? [] },
  ...activeFolderChain.value.map((folder) => ({ name: `folder:${folder.name}`, variables: folder.variables ?? [] })),
  {
    name: "request",
    variables:
      activeProtocol.value === "websocket"
        ? websocketRequest.value.variables ?? []
        : activeProtocol.value === "grpc"
          ? grpcRequest.value.variables ?? []
          : request.value.variables ?? []
  },
  { name: "session", variables: sessionVariables.value }
]);
const restResolution = computed(() => resolveRequest(request.value, resolutionScopes.value));
const graphqlResolution = computed(() => resolveGraphQLRequest(graphqlRequest.value, resolutionScopes.value));
const websocketResolution = computed(() => resolveWebSocketRequest(websocketRequest.value, resolutionScopes.value));
const grpcResolution = computed(() => resolveGrpcRequest(grpcRequest.value, resolutionScopes.value));
const resolution = computed(() => {
  if (activeProtocol.value === "graphql") return graphqlResolution.value;
  if (activeProtocol.value === "websocket") return websocketResolution.value;
  if (activeProtocol.value === "grpc") return grpcResolution.value;
  return restResolution.value;
});
const folderOptions = computed(() => folders.value.filter((folder) => folder.collectionId === saveDialog.collectionId).sort(sortByOrder));
const statusClass = computed(() => {
  const code = response.value?.status ?? 0;
  if (code >= 200 && code < 300) return "ok";
  if (code >= 400) return "bad";
  return "warn";
});
const responseContentType = computed(() => response.value?.headers.find((h) => h.key.toLowerCase() === "content-type")?.value ?? "");
const responseBody = computed(() => prettyBody(response.value?.body ?? "", responseContentType.value));
const responseDisplayBody = computed(() => {
  const body = responsePretty.value ? responseBody.value : response.value?.body ?? "";
  const query = responseSearch.value.trim().toLowerCase();
  if (!query) return body;
  const matches = body
    .split("\n")
    .filter((line) => line.toLowerCase().includes(query))
    .join("\n");
  return matches || body;
});
const displayedHistory = computed(() => searchHistory(history.value, debouncedHistoryQuery.value, 100));
const diffableHistory = computed(() => history.value.filter((entry) => entry.response));
const diffLeftEntry = computed(() => history.value.find((entry) => entry.id === diffLeftId.value));
const diffRightEntry = computed(() => history.value.find((entry) => entry.id === diffRightId.value));
const assertionSummary = computed(() => {
  const total = assertionResults.value.length;
  const passed = assertionResults.value.filter((result) => result.passed).length;
  return { total, passed, failed: total - passed };
});
const graphqlRootTypes = computed(() => rootGraphQLTypes(graphqlSchema.value));
const graphqlPublicTypes = computed(() => publicGraphQLTypes(graphqlSchema.value));
const codeExportRequest = computed<RequestConfig>(() => {
  if (activeProtocol.value === "graphql") {
    return resolveRequest(graphQLToRequestConfig(graphqlResolution.value.request as GraphQLRequestConfig)).request;
  }
  if (activeProtocol.value === "websocket") {
    return { ...emptyRequest(), method: "GET" as HttpMethod, url: websocketResolution.value.request.url, headers: websocketResolution.value.request.headers };
  }
  if (activeProtocol.value === "grpc") {
    return { ...emptyRequest(), method: "POST" as HttpMethod, url: grpcResolution.value.request.address, bodyMode: "json", body: grpcResolution.value.request.body };
  }
  return restResolution.value.request;
});
const codeExportKey = computed(() => JSON.stringify({ target: codeTarget.value, request: codeExportRequest.value }));
const codeExportMeta = computed(() => CODE_EXPORT_TARGETS.find((target) => target.target === codeTarget.value) ?? CODE_EXPORT_TARGETS[0]);
const paletteItems = computed(() => buildPaletteItems());
const paletteResults = computed(() => {
  const query = commandQuery.value.trim();
  if (!query) return paletteItems.value.slice(0, 18);
  const fuse = new Fuse(paletteItems.value, {
    keys: [
      { name: "title", weight: 0.5 },
      { name: "subtitle", weight: 0.25 },
      { name: "keywords", weight: 0.25 }
    ],
    threshold: 0.38,
    ignoreLocation: true
  });
  return fuse.search(query).map((result) => result.item).slice(0, 24);
});
const activeUrlValue = computed(() => {
  if (activeProtocol.value === "graphql") return graphqlRequest.value.url;
  if (activeProtocol.value === "websocket") return websocketRequest.value.url;
  if (activeProtocol.value === "grpc") return grpcRequest.value.address;
  return request.value.url;
});
const shortcutRows = [
  { keys: "Ctrl/Command K", action: "Command palette" },
  { keys: "Ctrl/Command Enter", action: "Send request" },
  { keys: "Ctrl/Command S", action: "Save request" },
  { keys: "Ctrl/Command N", action: "New request" },
  { keys: "Ctrl/Command /", action: "Keyboard shortcuts" },
  { keys: "?", action: "Keyboard shortcuts" },
  { keys: "Escape", action: "Close overlays" }
];

watch(theme, (value) => {
  document.documentElement.dataset.theme = value;
  localStorage.setItem("theme", value);
});

watch(
  uiFontSize,
  (value) => {
    const next = Number.isFinite(value) ? Math.min(18, Math.max(11, value)) : 13;
    document.documentElement.style.setProperty("--editor-font-size", `${next}px`);
    localStorage.setItem("uiFontSize", String(next));
  },
  { immediate: true }
);

watch(historyQuery, (value) => {
  if (historySearchTimer) clearTimeout(historySearchTimer);
  historySearchTimer = setTimeout(() => {
    debouncedHistoryQuery.value = value;
  }, 200);
});

watch([commandQuery, paletteResults], () => {
  selectedCommandIndex.value = Math.min(selectedCommandIndex.value, Math.max(paletteResults.value.length - 1, 0));
});

watch(
  codeExportKey,
  () => {
    void refreshCodeSnippet();
  },
  { immediate: true }
);

watch(
  () => saveDialog.collectionId,
  (collectionId) => {
    if (saveDialog.folderId && !folders.value.some((folder) => folder.collectionId === collectionId && folder.id === saveDialog.folderId)) {
      saveDialog.folderId = "";
    }
  }
);

watch(
  () => graphqlRequest.value.url,
  () => {
    void loadCachedGraphQLSchema();
  }
);

onMounted(async () => {
  document.documentElement.dataset.theme = theme.value;
  await refreshAll();
  await refreshMockRoutes();
  await loadCachedGraphQLSchema();
  try {
    const pong = await pingWithRetry();
    status.value = pong.message;
  } catch (error) {
    status.value = `Executor offline: ${String(error)}`;
  }
  window.addEventListener("keydown", handleShortcut);
  window.addEventListener("click", closeContextMenu);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleShortcut);
  window.removeEventListener("click", closeContextMenu);
  if (historySearchTimer) clearTimeout(historySearchTimer);
  if (websocketPollTimer) clearInterval(websocketPollTimer);
  if (websocketConnectionId.value) void webSocketClose(websocketConnectionId.value);
});

async function pingWithRetry() {
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await ping();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

async function refreshAll() {
  collections.value = await store.listCollections();
  folders.value = await store.listFolders();
  requests.value = await store.listRequests();
  environments.value = await store.listEnvironments();
  activeEnvironmentId.value = await store.getActiveEnvironmentId();
  expandedFolderIds.value = (await store.getMeta<string[]>("expandedFolders")) ?? [];
  history.value = await store.listHistory(10000);
  flows.value = await store.listFlows();
  if (flowDraft.value.id && !flows.value.some((flow) => flow.id === flowDraft.value.id)) flowDraft.value = emptyFlow();
  if (collections.value.length === 0) {
    const collection = await store.createCollection("Scratch");
    collections.value = [collection];
  }
}

function buildFolderTree(collectionId: string, parentFolderId: string | null = null, depth = 0): FolderTreeNodeView[] {
  return folders.value
    .filter((folder) => folder.collectionId === collectionId && (folder.parentFolderId ?? null) === parentFolderId)
    .sort(sortByOrder)
    .map((folder) => ({
      folder,
      depth,
      folders: buildFolderTree(collectionId, folder.id, depth + 1),
      requests: sortedRequests(requests.value.filter((item) => item.collectionId === collectionId && item.folderId === folder.id))
    }));
}

function sortedRequests(items: SavedRequest[]) {
  return [...items].sort(sortByOrder);
}

function sortByOrder<T extends { sortOrder?: number; name: string }>(left: T, right: T) {
  return (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.name.localeCompare(right.name);
}

function folderChain(folderId?: string | null) {
  const byId = new Map(folders.value.map((folder) => [folder.id, folder]));
  const chain: Folder[] = [];
  let current = folderId ? byId.get(folderId) : undefined;
  while (current) {
    chain.unshift(current);
    current = current.parentFolderId ? byId.get(current.parentFolderId) : undefined;
  }
  return chain;
}

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable;
}

function handleShortcut(event: KeyboardEvent) {
  if (event.key === "Escape") {
    if (commandPaletteOpen.value || showHelp.value || showSettings.value) {
      event.preventDefault();
      closeOverlays();
    }
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openCommandPalette();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "/") {
    event.preventDefault();
    showHelp.value = true;
    return;
  }
  if (event.key === "?" && !isEditableTarget(event.target)) {
    event.preventDefault();
    showHelp.value = true;
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    send();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    openSave();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
    event.preventDefault();
    newRequest();
  }
}

function openCommandPalette(initialQuery = "") {
  closeContextMenu();
  commandQuery.value = initialQuery;
  selectedCommandIndex.value = 0;
  commandPaletteOpen.value = true;
  void nextTick(() => commandInput.value?.focus());
}

function closeOverlays() {
  commandPaletteOpen.value = false;
  showHelp.value = false;
  showSettings.value = false;
}

function sidebarCount(section: SidebarSection) {
  if (section === "collections") return requests.value.length + folders.value.length;
  if (section === "history") return displayedHistory.value.length;
  if (section === "environments") return environments.value.length;
  if (section === "flows") return flows.value.length;
  return mockRoutes.value.length;
}

function protocolLabel(protocol: RequestProtocol) {
  if (protocol === "rest") return "REST";
  if (protocol === "graphql") return "GraphQL";
  if (protocol === "websocket") return "WebSocket";
  return "gRPC";
}

function methodClass(method?: string) {
  return `method-${(method || "GET").toLowerCase()}`;
}

function statusTone(code?: number) {
  if (!code) return "status-empty";
  if (code >= 200 && code < 300) return "status-ok";
  if (code >= 300 && code < 400) return "status-warn";
  if (code >= 400 && code < 500) return "status-bad";
  return "status-error";
}

function urlParts(value = activeUrlValue.value) {
  const parts: Array<{ text: string; variable: boolean }> = [];
  const pattern = /\{\{\s*([^}]+?)\s*\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    if (match.index > lastIndex) parts.push({ text: value.slice(lastIndex, match.index), variable: false });
    parts.push({ text: match[0], variable: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < value.length) parts.push({ text: value.slice(lastIndex), variable: false });
  return parts.length ? parts : [{ text: value, variable: false }];
}

function ensureProxySettings() {
  activeOptions.value.proxy ??= { type: "http", url: "" };
}

function movePaletteSelection(delta: number) {
  if (paletteResults.value.length === 0) return;
  selectedCommandIndex.value = (selectedCommandIndex.value + delta + paletteResults.value.length) % paletteResults.value.length;
}

async function runSelectedPaletteItem(item = paletteResults.value[selectedCommandIndex.value]) {
  if (!item) return;
  commandPaletteOpen.value = false;
  commandQuery.value = "";
  selectedCommandIndex.value = 0;
  await item.run();
}

function buildPaletteItems(): PaletteItem[] {
  return [
    ...commandPaletteItems(),
    ...collections.value.map(collectionPaletteItem),
    ...folders.value.map(folderPaletteItem),
    ...requests.value.map(requestPaletteItem),
    ...environments.value.map(environmentPaletteItem),
    ...history.value.slice(0, 100).map(historyPaletteItem)
  ];
}

function commandPaletteItems(): PaletteItem[] {
  const collection = activeCollection.value ?? collections.value[0];
  return [
    {
      id: "command:theme",
      kind: "command",
      title: "Toggle theme",
      subtitle: `Switch to ${theme.value === "dark" ? "light" : "dark"} mode`,
      keywords: "theme dark light appearance",
      run: () => {
        theme.value = theme.value === "dark" ? "light" : "dark";
      }
    },
    {
      id: "command:settings",
      kind: "command",
      title: "Open settings",
      subtitle: "Theme and local data",
      keywords: "settings preferences options",
      run: () => {
        showSettings.value = true;
      }
    },
    {
      id: "command:new-request",
      kind: "command",
      title: "New request",
      subtitle: "Create a blank request",
      keywords: "new request rest graphql",
      run: newRequest
    },
    {
      id: "command:new-collection",
      kind: "command",
      title: "New collection",
      subtitle: "Create a collection",
      keywords: "new collection",
      run: createCollection
    },
    {
      id: "command:new-folder",
      kind: "command",
      title: "New folder",
      subtitle: collection ? `Inside ${collection.name}` : "Create a folder",
      keywords: "new folder directory",
      run: () => (collection ? createFolderIn(collection.id, request.value.folderId ?? null) : undefined)
    },
    {
      id: "command:import",
      kind: "command",
      title: "Import...",
      subtitle: "OpenAPI, Postman, or Invoke ZIP",
      keywords: "import openapi postman invoke yaml zip",
      run: () => openApiFileInput.value?.click()
    },
    {
      id: "command:export",
      kind: "command",
      title: "Export collection...",
      subtitle: collection ? collection.name : "No collection selected",
      keywords: "export collection zip yaml",
      run: () => (collection ? exportCollection(collection) : undefined)
    },
    {
      id: "command:help",
      kind: "command",
      title: "Keyboard shortcuts",
      subtitle: "Open shortcut help",
      keywords: "help shortcut keyboard",
      run: () => {
        showHelp.value = true;
      }
    }
  ];
}

function collectionPaletteItem(collection: Collection): PaletteItem {
  return {
    id: `collection:${collection.id}`,
    kind: "collection",
    title: collection.name,
    subtitle: "Collection",
    keywords: `${collection.name} collection`,
    run: () => selectCollection(collection.id)
  };
}

function folderPaletteItem(folder: Folder): PaletteItem {
  const collection = collections.value.find((item) => item.id === folder.collectionId);
  const chain = folderChain(folder.id);
  return {
    id: `folder:${folder.id}`,
    kind: "folder",
    title: folder.name,
    subtitle: [collection?.name, ...chain.map((item) => item.name)].filter(Boolean).join(" / "),
    keywords: `${folder.name} folder ${collection?.name ?? ""} ${chain.map((item) => item.name).join(" ")}`,
    run: async () => {
      selectCollection(folder.collectionId);
      const expanded = new Set(expandedFolderIds.value);
      chain.forEach((item) => expanded.add(item.id));
      expandedFolderIds.value = [...expanded];
      await store.setMeta("expandedFolders", expandedFolderIds.value);
    }
  };
}

function requestPaletteItem(saved: SavedRequest): PaletteItem {
  const collection = collections.value.find((item) => item.id === saved.collectionId);
  const chain = folderChain(saved.folderId);
  const url = requestUrl(saved.request);
  return {
    id: `request:${saved.id}`,
    kind: "request",
    title: saved.name,
    subtitle: [collection?.name, ...chain.map((item) => item.name), url].filter(Boolean).join(" / "),
    keywords: `${saved.name} ${url} ${savedMethod(saved)} ${collection?.name ?? ""} ${chain.map((item) => item.name).join(" ")}`,
    method: savedMethod(saved),
    run: () => loadRequest(saved)
  };
}

function environmentPaletteItem(environment: Environment): PaletteItem {
  return {
    id: `environment:${environment.id}`,
    kind: "environment",
    title: environment.name,
    subtitle: "Environment",
    keywords: `${environment.name} environment ${environment.variables.map((item) => item.key).join(" ")}`,
    run: () => setActiveEnvironment(environment.id)
  };
}

function historyPaletteItem(entry: HistoryEntry): PaletteItem {
  return {
    id: `history:${entry.id}`,
    kind: "history",
    title: `${historyMethod(entry)} ${historyUrl(entry)}`,
    subtitle: `${entry.response?.status ?? "-"} ${new Date(entry.createdAt).toLocaleString()}`,
    keywords: `${historyMethod(entry)} ${historyUrl(entry)} ${entry.response?.body ?? ""}`,
    method: historyMethod(entry),
    run: () => loadHistory(entry)
  };
}

function currentRestRequest(): RequestDraft {
  return {
    ...request.value,
    scripts: request.value.scripts ?? { preRequest: "", postResponse: "" },
    assertions: clone(assertionRules.value),
    extractionRules: clone(extractRules.value)
  };
}

function currentGraphQLRequest(): GraphQLRequestConfig {
  return {
    ...graphqlRequest.value,
    scripts: graphqlRequest.value.scripts ?? { preRequest: "", postResponse: "" },
    assertions: clone(assertionRules.value),
    extractionRules: clone(extractRules.value)
  };
}

function currentWebSocketRequest(): WebSocketRequestConfig {
  return {
    ...websocketRequest.value,
    scripts: websocketRequest.value.scripts ?? { preRequest: "", postResponse: "" }
  };
}

function currentGrpcRequest(): GrpcRequestConfig {
  return {
    ...grpcRequest.value,
    scripts: grpcRequest.value.scripts ?? { preRequest: "", postResponse: "" }
  };
}

async function withOAuth2Token<T extends ProtocolRequestConfig>(source: T): Promise<T> {
  const auth = (source as { auth?: AuthConfig }).auth;
  if (auth?.type !== "oauth2") return source;
  if (!auth.tokenUrl || !auth.clientId) return source;

  const cacheKey = JSON.stringify({ tokenUrl: auth.tokenUrl, clientId: auth.clientId, scope: auth.scope ?? "" });
  const cached = oauth2TokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30000) {
    return { ...source, auth: { ...auth, token: cached.token } } as T;
  }

  const token = await oauth2ClientCredentials(auth);
  if (token.error || !token.accessToken) throw new Error(token.error || "OAuth2 token response did not include access_token");
  oauth2TokenCache.set(cacheKey, {
    token: token.accessToken,
    expiresAt: Date.now() + Math.max((token.expiresIn ?? 3600) - 30, 30) * 1000
  });
  return { ...source, auth: { ...auth, token: token.accessToken } } as T;
}

async function withAwsSigV4(requestConfig: RequestConfig): Promise<RequestConfig> {
  return signAwsSigV4Request(requestConfig);
}

async function send() {
  if (activeProtocol.value === "websocket") {
    await connectWebSocket();
    return;
  }
  if (activeProtocol.value === "grpc") {
    await sendGrpc();
    return;
  }
  loading.value = true;
  streamBytes.value = 0;
  assertionResults.value = [];
  response.value = undefined;
  try {
    const initialSource = activeProtocol.value === "graphql" ? currentGraphQLRequest() : currentRestRequest();
    const variables = variablesFromScopes(resolutionScopes.value);
    const scriptResult = await runPreRequestScript(initialSource, variables, initialSource.scripts?.preRequest ?? "");
    scriptLogs.value = scriptResult.logs;
    sessionVariables.value = { ...sessionVariables.value, ...changedVariables(variables, scriptResult.variables) };
    if (scriptResult.skipped) {
      status.value = scriptResult.skipReason || "Skipped by script";
      return;
    }
    const source = await withOAuth2Token(scriptResult.request);
    const resolved =
      activeProtocol.value === "graphql"
        ? resolveGraphQLRequest(source as GraphQLRequestConfig, resolutionScopes.value)
        : resolveRequest(source as RequestConfig, resolutionScopes.value);
    let executable = activeProtocol.value === "graphql" ? graphQLToRequestConfig(resolved.request as GraphQLRequestConfig) : (resolved.request as RequestConfig);
    executable = await withAwsSigV4(executable);
    if (resolved.unresolved.length > 0) {
      status.value = `Unresolved: ${resolved.unresolved.join(", ")}`;
    }
    if (streamMode.value) {
      await sendStreaming(executable, source);
      return;
    }
    const result = await execute(executable);
    await finishResponse(result, source);
  } catch (error) {
    status.value = String(error);
  } finally {
    loading.value = false;
    streaming.value = false;
  }
}

async function sendStreaming(executable: RequestConfig, source: ProtocolRequestConfig) {
  const controller = new AbortController();
  streamController.value = controller;
  streaming.value = true;
  response.value = {
    status: 0,
    statusText: "streaming...",
    headers: [],
    body: "",
    timing: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 0, transferMs: 0, totalMs: 0 },
    requestSize: executable.body.length,
    responseSize: 0
  };
  await executeStream(executable, {
    signal: controller.signal,
    onChunk(chunk) {
      response.value = response.value
        ? { ...response.value, body: `${response.value.body}${chunk}`, responseSize: response.value.responseSize + chunk.length }
        : response.value;
      streamBytes.value += chunk.length;
    },
    onFinal: async (finalResponse) => {
      const body = finalResponse.body || response.value?.body || "";
      await finishResponse({ ...finalResponse, body, responseSize: finalResponse.responseSize || body.length }, source);
    }
  });
}

async function sendGrpc() {
  loading.value = true;
  assertionResults.value = [];
  response.value = undefined;
  try {
    const initialSource = currentGrpcRequest();
    const variables = variablesFromScopes(resolutionScopes.value);
    const scriptResult = await runPreRequestScript(initialSource, variables, initialSource.scripts?.preRequest ?? "");
    scriptLogs.value = scriptResult.logs;
    sessionVariables.value = { ...sessionVariables.value, ...changedVariables(variables, scriptResult.variables) };
    if (scriptResult.skipped) {
      status.value = scriptResult.skipReason || "Skipped by script";
      return;
    }
    const source = scriptResult.request as GrpcRequestConfig;
    const resolved = resolveGrpcRequest(source, resolutionScopes.value);
    if (resolved.unresolved.length > 0) status.value = `Unresolved: ${resolved.unresolved.join(", ")}`;
    const result = await grpcExecute(resolved.request);
    const body = result.bodyJson || "";
    await finishResponse(
      {
        status: result.statusCode,
        statusText: result.statusMessage || (result.error ? "gRPC error" : "OK"),
        headers: [...(result.metadata ?? []), ...(result.trailers ?? []).map((header) => ({ ...header, key: `trailer-${header.key}` }))],
        body,
        timing: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 0, transferMs: 0, totalMs: result.durationMs ?? 0 },
        requestSize: resolved.request.body.length,
        responseSize: body.length,
        error: result.error
      },
      source
    );
  } catch (error) {
    status.value = String(error);
  } finally {
    loading.value = false;
  }
}

async function finishResponse(result: ExecuteResponse, source: ProtocolRequestConfig) {
  response.value = result;
  assertionResults.value = runAssertions(result, assertionRules.value);
  const extracted = extractVariables(result, extractRules.value);
  sessionVariables.value = { ...sessionVariables.value, ...extracted };
  const postScript = (source as RequestConfig | GraphQLRequestConfig).scripts?.postResponse ?? "";
  if (postScript.trim()) {
    const variables = variablesFromScopes([...resolutionScopes.value, { name: "session", variables: sessionVariables.value }]);
    const scriptResult = await runPostResponseScript(source, result, variables, postScript);
    scriptLogs.value = [...scriptLogs.value, ...scriptResult.logs];
    sessionVariables.value = { ...sessionVariables.value, ...changedVariables(variables, scriptResult.variables) };
  }
  await store.addHistory({
    request: source,
    response: result,
    assertions: assertionResults.value,
    environmentId: activeEnvironmentId.value,
    requestId: request.value.id,
    collectionId: request.value.collectionId,
    protocol: activeProtocol.value
  });
  history.value = await store.listHistory(10000);
  const assertionLabel = assertionResults.value.length
    ? `, ${assertionSummary.value.passed}/${assertionSummary.value.total} assertions passed`
    : "";
  status.value = result.error ? result.error : `Completed in ${Math.round(result.timing?.totalMs ?? 0)} ms${assertionLabel}`;
}

async function reflectGrpcMethods() {
  grpcStatus.value = "Reflecting...";
  try {
    const resolved = resolveGrpcRequest(currentGrpcRequest(), resolutionScopes.value);
    if (resolved.unresolved.length) grpcStatus.value = `Unresolved: ${resolved.unresolved.join(", ")}`;
    const result = await grpcReflect(resolved.request);
    if (result.error) {
      grpcStatus.value = result.error;
      return;
    }
    grpcMethods.value = result.methods ?? [];
    grpcStatus.value = `${grpcMethods.value.length} methods`;
  } catch (error) {
    grpcStatus.value = error instanceof Error ? error.message : String(error);
  }
}

function selectGrpcMethod(method: GrpcMethodInfo) {
  grpcRequest.value = {
    ...grpcRequest.value,
    service: method.service,
    method: method.method,
    body: method.inputJson || grpcRequest.value.body || "{}"
  };
  grpcStatus.value = `${method.fullMethod} selected`;
}

function stopStream() {
  streamController.value?.abort();
  streaming.value = false;
  loading.value = false;
  status.value = "Stream stopped";
}

async function connectWebSocket() {
  if (websocketState.value === "connected") {
    await disconnectWebSocket();
    return;
  }
  try {
    const initial = currentWebSocketRequest();
    const variables = variablesFromScopes(resolutionScopes.value);
    const scriptResult = await runPreRequestScript(initial, variables, initial.scripts?.preRequest ?? "");
    scriptLogs.value = scriptResult.logs;
    sessionVariables.value = { ...sessionVariables.value, ...changedVariables(variables, scriptResult.variables) };
    if (scriptResult.skipped) {
      status.value = scriptResult.skipReason || "Skipped by script";
      return;
    }
    const source = await withOAuth2Token(scriptResult.request as WebSocketRequestConfig);
    const resolved = resolveWebSocketRequest(source, resolutionScopes.value);
    if (resolved.unresolved.length) status.value = `Unresolved: ${resolved.unresolved.join(", ")}`;
    if (websocketConnectionId.value) await disconnectWebSocket();
    websocketState.value = "connecting";
    websocketLog.value = [];
    appendWebSocketLog("system", "open", `Connecting to ${resolved.request.url}`);
    const connection = await webSocketConnect(resolved.request);
    if (connection.error) throw new Error(connection.error);
    websocketConnectionId.value = connection.connectionId;
    websocketState.value = "connected";
    status.value = "WebSocket connected";
    appendWebSocketLog("system", "open", "Connected");
    startWebSocketPolling();
  } catch (error) {
    websocketState.value = "disconnected";
    status.value = error instanceof Error ? error.message : String(error);
  }
}

async function disconnectWebSocket() {
  if (websocketPollTimer) {
    clearInterval(websocketPollTimer);
    websocketPollTimer = undefined;
  }
  const connectionId = websocketConnectionId.value;
  websocketConnectionId.value = "";
  websocketState.value = "disconnected";
  if (connectionId) {
    const result = await webSocketClose(connectionId);
    if (result.error) status.value = result.error;
  }
  appendWebSocketLog("system", "close", "Closed");
}

async function sendWebSocketMessage() {
  const connectionId = websocketConnectionId.value;
  if (!connectionId || websocketState.value !== "connected") {
    status.value = "WebSocket is not connected";
    return;
  }
  const resolved = resolveWebSocketRequest(currentWebSocketRequest(), resolutionScopes.value);
  let payload = resolved.request.message;
  try {
    if (resolved.request.messageMode === "json") {
      payload = JSON.stringify(JSON.parse(payload));
    }
  } catch (error) {
    status.value = `Invalid JSON message: ${error instanceof Error ? error.message : String(error)}`;
    return;
  }
  const result = await webSocketSend(connectionId, payload, false);
  if (result.error) {
    status.value = result.error;
    appendWebSocketLog("system", "error", result.error);
  }
}

function appendWebSocketLog(direction: WebSocketLogItem["direction"], type: string, body: string) {
  websocketLog.value = [...websocketLog.value, { id: crypto.randomUUID(), direction, type, body, createdAt: Date.now() }].slice(-500);
}

function startWebSocketPolling() {
  if (websocketPollTimer) clearInterval(websocketPollTimer);
  websocketPollTimer = setInterval(() => {
    void pollWebSocketMessages();
  }, 800);
  void pollWebSocketMessages();
}

async function pollWebSocketMessages() {
  const connectionId = websocketConnectionId.value;
  if (!connectionId) return;
  try {
    const result = await webSocketPoll(connectionId);
    if (result.error) {
      appendWebSocketLog("system", "error", result.error);
      status.value = result.error;
      await disconnectWebSocket();
      return;
    }
    for (const message of result.messages ?? []) {
      appendWebSocketLog(webSocketDirection(message.direction), message.type, message.body);
    }
    if (!result.connected) {
      websocketState.value = "disconnected";
      if (websocketPollTimer) clearInterval(websocketPollTimer);
      websocketPollTimer = undefined;
      appendWebSocketLog("system", "close", "Connection closed");
    }
  } catch (error) {
    status.value = error instanceof Error ? error.message : String(error);
  }
}

function webSocketDirection(direction: string): WebSocketLogItem["direction"] {
  if (direction === "in") return "received";
  if (direction === "out") return "sent";
  return "system";
}

function newRequest() {
  request.value = emptyRequest();
  graphqlRequest.value = emptyGraphQLRequest();
  websocketRequest.value = emptyWebSocketRequest();
  grpcRequest.value = emptyGrpcRequest();
  response.value = undefined;
  assertionRules.value = [];
  assertionResults.value = [];
  extractRules.value = [];
  scriptLogs.value = [];
}

function newRequestIn(collectionId?: string, folderId: string | null = null) {
  request.value = {
    ...emptyRequest(),
    collectionId: collectionId ?? collections.value[0]?.id,
    folderId
  };
  graphqlRequest.value = emptyGraphQLRequest();
  websocketRequest.value = emptyWebSocketRequest();
  grpcRequest.value = emptyGrpcRequest();
  response.value = undefined;
  assertionRules.value = [];
  assertionResults.value = [];
  extractRules.value = [];
  scriptLogs.value = [];
  closeContextMenu();
}

function selectCollection(collectionId: string) {
  request.value = { ...request.value, collectionId, folderId: null };
}

function setProtocol(protocol: RequestProtocol) {
  if (!protocols.includes(protocol)) return;
  request.value = { ...request.value, protocol };
  if (protocol === "graphql" && selectedTab.value === "params") selectedTab.value = "graphql";
  if (protocol === "websocket") selectedTab.value = "websocket";
  if (protocol === "grpc") selectedTab.value = "grpc";
  if (protocol === "rest" && (selectedTab.value === "graphql" || selectedTab.value === "graphqlVariables" || selectedTab.value === "websocket" || selectedTab.value === "grpc")) {
    selectedTab.value = "params";
  }
}

async function createCollection() {
  const name = prompt("Collection name", "New collection");
  if (!name) return;
  await store.createCollection(name);
  await refreshAll();
}

function openSave() {
  saveDialog.name = request.value.name ?? "Untitled request";
  saveDialog.collectionId = request.value.collectionId ?? collections.value[0]?.id ?? "";
  saveDialog.folderId = request.value.folderId ?? "";
  saveDialog.open = true;
}

async function saveRequest() {
  if (!saveDialog.name || !saveDialog.collectionId) return;
  const payload =
    activeProtocol.value === "graphql"
      ? currentGraphQLRequest()
      : activeProtocol.value === "websocket"
        ? currentWebSocketRequest()
        : activeProtocol.value === "grpc"
          ? currentGrpcRequest()
          : currentRestRequest();
  const saved = await store.saveRequest(payload, saveDialog.name, saveDialog.collectionId, {
    folderId: saveDialog.folderId || null,
    protocol: activeProtocol.value
  });
  applySavedRequest(saved);
  saveDialog.open = false;
  await refreshAll();
}

function loadRequest(saved: SavedRequest) {
  applySavedRequest(saved);
  response.value = undefined;
  assertionResults.value = [];
}

function requestDraftFromSaved(saved: SavedRequest): RequestDraft {
  return {
    ...(JSON.parse(JSON.stringify(saved.request)) as RequestConfig),
    scripts: (saved.request as RequestConfig).scripts ?? { preRequest: "", postResponse: "" },
    id: saved.id,
    collectionId: saved.collectionId,
    folderId: saved.folderId,
    name: saved.name,
    protocol: saved.protocol,
    sortOrder: saved.sortOrder
  };
}

function applySavedRequest(saved: SavedRequest) {
  assertionRules.value = "assertions" in saved.request ? clone(saved.request.assertions ?? []) : [];
  extractRules.value = "extractionRules" in saved.request ? normalizeExtractionRules(saved.request.extractionRules) : [];
  if (saved.protocol === "graphql") {
    graphqlRequest.value = { ...emptyGraphQLRequest(), ...(JSON.parse(JSON.stringify(saved.request)) as GraphQLRequestConfig) };
    request.value = {
      ...emptyRequest(),
      id: saved.id,
      collectionId: saved.collectionId,
      folderId: saved.folderId,
      name: saved.name,
      protocol: "graphql",
      sortOrder: saved.sortOrder
    };
    selectedTab.value = "graphql";
    return;
  }
  if (saved.protocol === "websocket") {
    websocketRequest.value = { ...emptyWebSocketRequest(), ...(JSON.parse(JSON.stringify(saved.request)) as WebSocketRequestConfig) };
    request.value = {
      ...emptyRequest(),
      id: saved.id,
      collectionId: saved.collectionId,
      folderId: saved.folderId,
      name: saved.name,
      protocol: "websocket",
      sortOrder: saved.sortOrder
    };
    selectedTab.value = "websocket";
    return;
  }
  if (saved.protocol === "grpc") {
    grpcRequest.value = { ...emptyGrpcRequest(), ...(JSON.parse(JSON.stringify(saved.request)) as GrpcRequestConfig) };
    request.value = {
      ...emptyRequest(),
      id: saved.id,
      collectionId: saved.collectionId,
      folderId: saved.folderId,
      name: saved.name,
      protocol: "grpc",
      sortOrder: saved.sortOrder
    };
    selectedTab.value = "grpc";
    return;
  }

  request.value = requestDraftFromSaved(saved);
}

function savedMethod(saved: SavedRequest) {
  if (saved.protocol === "graphql") return "GQL";
  if (saved.protocol === "websocket") return "WS";
  if (saved.protocol === "grpc") return "RPC";
  return (saved.request as RequestConfig).method;
}

function historyMethod(entry: HistoryEntry) {
  if (entry.protocol === "graphql") return "GQL";
  if (entry.protocol === "websocket") return "WS";
  if (entry.protocol === "grpc") return "RPC";
  return (entry.request as RequestConfig).method;
}

function historyUrl(entry: HistoryEntry) {
  return requestUrl(entry.request) || "Untitled";
}

function requestUrl(item: ProtocolRequestConfig) {
  if ("url" in item) return item.url;
  if ("address" in item) return `${item.address}/${item.service}/${item.method}`;
  return "";
}

async function deleteRequest(saved: SavedRequest) {
  if (!confirm(`Delete ${saved.name}?`)) return;
  await store.deleteRequest(saved.id);
  await refreshAll();
  closeContextMenu();
}

async function deleteCollection(collection: Collection) {
  if (!confirm(`Delete ${collection.name} and all requests inside it?`)) return;
  await store.deleteCollection(collection.id);
  await refreshAll();
  closeContextMenu();
}

async function duplicateCollection(collection: Collection) {
  const copy = await store.createCollection(`${collection.name} copy`, { variables: clone(collection.variables ?? []) });
  const folderMap = new Map<string, string>();
  const sourceFolders = folders.value.filter((folder) => folder.collectionId === collection.id).sort(sortByOrder);

  for (const folder of sourceFolders) {
    const parentFolderId = folder.parentFolderId ? folderMap.get(folder.parentFolderId) ?? null : null;
    const saved = await store.createFolder(copy.id, folder.name, parentFolderId, {
      variables: clone(folder.variables ?? []),
      sortOrder: folder.sortOrder
    });
    folderMap.set(folder.id, saved.id);
  }

  for (const saved of requests.value.filter((item) => item.collectionId === collection.id).sort(sortByOrder)) {
    await store.saveRequest(saved.request, saved.name, copy.id, {
      folderId: saved.folderId ? folderMap.get(saved.folderId) ?? null : null,
      protocol: saved.protocol,
      sortOrder: saved.sortOrder
    });
  }

  await refreshAll();
  closeContextMenu();
}

function openCollectionContext(event: MouseEvent, collection: Collection) {
  openContextMenu(event, { type: "collection", collection });
}

function openFolderContext(event: MouseEvent, folder: Folder) {
  openContextMenu(event, { type: "folder", folder });
}

function openRequestContext(event: MouseEvent, saved: SavedRequest) {
  openContextMenu(event, { type: "request", request: saved });
}

function openContextMenu(event: MouseEvent, target: ContextTarget) {
  contextMenu.open = true;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.target = target;
}

function closeContextMenu() {
  contextMenu.open = false;
}

async function toggleFolder(folderId: string) {
  const next = expandedFolderIds.value.includes(folderId)
    ? expandedFolderIds.value.filter((id) => id !== folderId)
    : [...expandedFolderIds.value, folderId];
  expandedFolderIds.value = next;
  await store.setMeta("expandedFolders", next);
}

async function createFolderIn(collectionId: string, parentFolderId: string | null = null) {
  const name = prompt("Folder name", "New folder");
  if (!name) return;
  const folder = await store.createFolder(collectionId, name, parentFolderId);
  const nextExpanded = new Set(expandedFolderIds.value);
  nextExpanded.add(folder.id);
  if (parentFolderId) nextExpanded.add(parentFolderId);
  expandedFolderIds.value = [...nextExpanded];
  await store.setMeta("expandedFolders", expandedFolderIds.value);
  await refreshAll();
  closeContextMenu();
}

async function renameFolder(folder: Folder) {
  const name = prompt("Folder name", folder.name);
  if (!name || name === folder.name) return;
  await store.updateFolder({ ...folder, name });
  await refreshAll();
  closeContextMenu();
}

async function deleteFolder(folder: Folder) {
  if (!confirm(`Delete ${folder.name} and everything inside it?`)) return;
  await store.deleteFolder(folder.id);
  expandedFolderIds.value = expandedFolderIds.value.filter((id) => id !== folder.id);
  await store.setMeta("expandedFolders", expandedFolderIds.value);
  if (request.value.folderId === folder.id) newRequestIn(folder.collectionId, null);
  await refreshAll();
  closeContextMenu();
}

async function duplicateFolder(folder: Folder) {
  const copy = await store.createFolder(folder.collectionId, `${folder.name} copy`, folder.parentFolderId ?? null, {
    variables: clone(folder.variables ?? [])
  });
  await duplicateFolderChildren(folder.id, copy.id);
  await refreshAll();
  closeContextMenu();
}

async function duplicateFolderChildren(sourceFolderId: string, targetFolderId: string) {
  for (const saved of requests.value.filter((item) => item.folderId === sourceFolderId).sort(sortByOrder)) {
    await store.saveRequest(saved.request, saved.name, saved.collectionId, {
      folderId: targetFolderId,
      protocol: saved.protocol,
      sortOrder: saved.sortOrder
    });
  }

  for (const child of folders.value.filter((folder) => folder.parentFolderId === sourceFolderId).sort(sortByOrder)) {
    const childCopy = await store.createFolder(child.collectionId, child.name, targetFolderId, {
      variables: clone(child.variables ?? []),
      sortOrder: child.sortOrder
    });
    await duplicateFolderChildren(child.id, childCopy.id);
  }
}

async function moveFolderToParent(folder: Folder) {
  if (!folder.parentFolderId) return;
  const parent = folders.value.find((item) => item.id === folder.parentFolderId);
  await store.updateFolder({ ...folder, parentFolderId: parent?.parentFolderId ?? null });
  await refreshAll();
  closeContextMenu();
}

async function renameCollection(collection: Collection) {
  const name = prompt("Collection name", collection.name);
  if (!name || name === collection.name) return;
  await store.updateCollection({ ...collection, name });
  await refreshAll();
  closeContextMenu();
}

async function duplicateRequest(saved: SavedRequest) {
  await store.saveRequest(saved.request, `${saved.name} copy`, saved.collectionId, {
    folderId: saved.folderId ?? null,
    protocol: saved.protocol
  });
  await refreshAll();
  closeContextMenu();
}

async function moveRequestToParent(saved: SavedRequest) {
  if (!saved.folderId) return;
  const currentFolder = folders.value.find((folder) => folder.id === saved.folderId);
  const nextFolderId = currentFolder?.parentFolderId ?? null;
  await store.moveRequest(saved.id, nextFolderId);
  if (request.value.id === saved.id) request.value = { ...request.value, folderId: nextFolderId };
  await refreshAll();
  closeContextMenu();
}

function startTreeDrag(event: DragEvent, payload: TreeDragPayload) {
  treeDrag.value = payload;
  event.dataTransfer?.setData("text/plain", `${payload.type}:${payload.id}`);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

function endTreeDrag() {
  treeDrag.value = undefined;
}

async function dropOnCollection(event: DragEvent, collectionId: string) {
  event.preventDefault();
  const payload = treeDrag.value;
  if (!payload) return;
  if (payload.type === "request") {
    const saved = requests.value.find((item) => item.id === payload.id);
    if (saved) {
      await store.saveRequest(saved.request, saved.name, collectionId, {
        id: saved.id,
        folderId: null,
        protocol: saved.protocol,
        sortOrder: Date.now(),
        createdAt: saved.createdAt
      });
    }
  } else {
    const folder = folders.value.find((item) => item.id === payload.id);
    if (folder && folder.collectionId === collectionId) await store.updateFolder({ ...folder, parentFolderId: null, sortOrder: Date.now() });
  }
  endTreeDrag();
  await refreshAll();
}

async function dropOnFolder(event: DragEvent, target: Folder) {
  event.preventDefault();
  const payload = treeDrag.value;
  if (!payload) return;
  if (payload.type === "request") {
    const saved = requests.value.find((item) => item.id === payload.id);
    if (saved) await store.moveRequest(saved.id, target.id);
  } else {
    const folder = folders.value.find((item) => item.id === payload.id);
    if (folder && folder.id !== target.id && !folderChain(target.id).some((item) => item.id === folder.id)) {
      await store.updateFolder({ ...folder, parentFolderId: target.id, sortOrder: Date.now() });
    }
  }
  endTreeDrag();
  await refreshAll();
}

async function dropBeforeRequest(event: DragEvent, target: SavedRequest) {
  event.preventDefault();
  const payload = treeDrag.value;
  if (!payload || payload.type !== "request" || payload.id === target.id) return;
  const saved = requests.value.find((item) => item.id === payload.id);
  if (!saved) return;
  await store.saveRequest(saved.request, saved.name, target.collectionId, {
    id: saved.id,
    folderId: target.folderId ?? null,
    protocol: saved.protocol,
    sortOrder: (target.sortOrder ?? Date.now()) - 0.5,
    createdAt: saved.createdAt
  });
  endTreeDrag();
  await refreshAll();
}

function editCollectionVariables(collection: Collection) {
  variableEditor.open = true;
  variableEditor.kind = "collection";
  variableEditor.id = collection.id;
  variableEditor.name = collection.name;
  variableEditor.variables = JSON.parse(JSON.stringify(collection.variables ?? []));
  closeContextMenu();
}

function editFolderVariables(folder: Folder) {
  variableEditor.open = true;
  variableEditor.kind = "folder";
  variableEditor.id = folder.id;
  variableEditor.name = folder.name;
  variableEditor.variables = JSON.parse(JSON.stringify(folder.variables ?? []));
  closeContextMenu();
}

async function saveScopeVariables() {
  if (variableEditor.kind === "collection") {
    const collection = collections.value.find((item) => item.id === variableEditor.id);
    if (collection) await store.updateCollection({ ...collection, variables: variableEditor.variables });
  }
  if (variableEditor.kind === "folder") {
    const folder = folders.value.find((item) => item.id === variableEditor.id);
    if (folder) await store.updateFolder({ ...folder, variables: variableEditor.variables });
  }
  variableEditor.open = false;
  await refreshAll();
}

function editEnvironment(environment?: Environment) {
  envDraft.value = environment
    ? JSON.parse(JSON.stringify(environment))
    : { id: "", name: "New environment", variables: [], createdAt: Date.now(), updatedAt: Date.now() };
  showEnvPanel.value = true;
}

async function saveEnvironment() {
  if (!envDraft.value) return;
  const saved = await store.saveEnvironment(envDraft.value);
  activeEnvironmentId.value = saved.id;
  await store.setActiveEnvironmentId(saved.id);
  showEnvPanel.value = false;
  await refreshAll();
}

async function deleteEnvironmentDraft() {
  if (!envDraft.value?.id || !confirm(`Delete ${envDraft.value.name}?`)) return;
  await store.deleteEnvironment(envDraft.value.id);
  showEnvPanel.value = false;
  await refreshAll();
}

async function setActiveEnvironment(id?: string) {
  activeEnvironmentId.value = id;
  await store.setActiveEnvironmentId(id);
}

async function refreshMockRoutes() {
  mockRoutes.value = (await store.getMeta<MockRoute[]>("mockRoutes")) ?? [];
  try {
    const remote = await loadMockRoutes();
    mockLogs.value = remote.logs;
    if (mockRoutes.value.length) await syncMockRoutes(mockRoutes.value);
    mockStatus.value = mockRoutes.value.length ? `${mockRoutes.value.length} routes synced at /mock` : "No mock routes";
  } catch (error) {
    mockStatus.value = `Mock server unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function addMockRoute() {
  mockRoutes.value.push({
    id: crypto.randomUUID(),
    enabled: true,
    method: "GET",
    pathPattern: "/users/:id",
    status: 200,
    headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
    body: '{ "id": "{{param.id}}", "mock": true, "requestId": "{{$uuid}}" }',
    latencyMs: 0
  });
}

async function saveMockRoutes() {
  await store.setMeta("mockRoutes", mockRoutes.value);
  const remote = await syncMockRoutes(mockRoutes.value);
  mockRoutes.value = remote.routes;
  mockStatus.value = `${remote.count} routes synced at /mock`;
}

async function refreshMockLogs() {
  const remote = await loadMockRoutes();
  mockLogs.value = remote.logs;
}

async function clearMockServerLogs() {
  await clearMockLogs();
  mockLogs.value = [];
}

function emptyFlow(): Flow {
  return {
    id: crypto.randomUUID(),
    name: "New flow",
    steps: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function newFlow() {
  flowDraft.value = emptyFlow();
  flowResult.value = undefined;
  flowLog.value = [];
}

function loadFlow(flow: Flow) {
  flowDraft.value = clone(flow);
  flowResult.value = undefined;
  flowLog.value = [];
}

async function saveFlowDraft() {
  const saved = await store.saveFlow(flowDraft.value);
  flowDraft.value = clone(saved);
  flows.value = await store.listFlows();
  status.value = `Saved flow ${saved.name}`;
}

async function deleteFlowDraft() {
  if (!flowDraft.value.id || !confirm(`Delete ${flowDraft.value.name}?`)) return;
  await store.deleteFlow(flowDraft.value.id);
  flowDraft.value = emptyFlow();
  flows.value = await store.listFlows();
  flowResult.value = undefined;
}

function addFlowRequestStep(saved?: SavedRequest) {
  const source =
    saved?.protocol === "graphql"
      ? graphQLToRequestConfig(saved.request as GraphQLRequestConfig)
      : saved?.protocol === "rest"
        ? toRequestConfig(saved.request as RequestConfig)
        : activeProtocol.value === "graphql"
          ? graphQLToRequestConfig(currentGraphQLRequest())
          : currentRestRequest();
  flowDraft.value.steps.push({
    id: crypto.randomUUID(),
    type: "request",
    name: saved?.name ?? request.value.name ?? (source.url || "Request"),
    request: clone(toRequestConfig(source)),
    continueOnFailure: false
  });
}

function addFlowDelayStep() {
  flowDraft.value.steps.push({
    id: crypto.randomUUID(),
    type: "delay",
    name: "Delay",
    delayMs: 1000
  });
}

function moveFlowStep(index: number, delta: number) {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= flowDraft.value.steps.length) return;
  const [item] = flowDraft.value.steps.splice(index, 1);
  flowDraft.value.steps.splice(nextIndex, 0, item);
}

async function runFlowDraft() {
  flowRunning.value = true;
  flowResult.value = undefined;
  flowLog.value = [];
  try {
    const runner = new FlowRunner();
    flowResult.value = await runner.run(clone(flowDraft.value), {
      execute,
      scopes: resolutionScopes.value,
      hooks: {
        onStepStart(step) {
          flowLog.value = [`Started ${step.name}`, ...flowLog.value].slice(0, 50);
        },
        onStepComplete(result) {
          flowLog.value = [`${result.status.toUpperCase()} ${result.name}`, ...flowLog.value].slice(0, 50);
        },
        onVariableExtracted(name, value) {
          flowLog.value = [`Set ${name}=${value}`, ...flowLog.value].slice(0, 50);
        }
      }
    });
    status.value = `Flow ${flowResult.value.status} in ${Math.round(flowResult.value.completedAt - flowResult.value.startedAt)} ms`;
  } catch (error) {
    status.value = error instanceof Error ? error.message : String(error);
  } finally {
    flowRunning.value = false;
  }
}

async function runSavedFlow(flow: Flow) {
  loadFlow(flow);
  await nextTick();
  await runFlowDraft();
}

function addKeyValue(target: KeyValue[]) {
  target.push({ key: "", value: "", enabled: true });
}

function removeAt(target: unknown[], index: number) {
  target.splice(index, 1);
}

function addAssertion() {
  assertionRules.value.push({
    id: crypto.randomUUID(),
    type: "status",
    expression: "",
    matcher: "equals",
    expected: "200",
    enabled: true
  });
}

function assertionLabel(assertionId: string) {
  const assertion = assertionRules.value.find((item) => item.id === assertionId);
  if (!assertion) return assertionId;
  if (assertion.type === "status") return "status";
  if (assertion.type === "responseTime") return "response time";
  return assertion.expression || assertion.type;
}

function historyAssertionLabel(entry: HistoryEntry) {
  if (!entry.assertions?.length) return "";
  const passed = entry.assertions.filter((assertion) => assertion.passed).length;
  return `${passed}/${entry.assertions.length}`;
}

function addExtraction() {
  extractRules.value.push({ id: crypto.randomUUID(), variableName: "", source: "body", expression: "$.", fallback: "", enabled: true });
}

function compareSelectedHistory() {
  const left = diffLeftEntry.value?.response;
  const right = diffRightEntry.value?.response;
  if (!left || !right || diffLeftId.value === diffRightId.value) return;
  diffResult.value = compareResponses(left, right);
  showDiffModal.value = true;
}

async function loadCachedGraphQLSchema() {
  if (!graphqlRequest.value.url.trim()) {
    graphqlSchema.value = undefined;
    graphqlSchemaStatus.value = "";
    return;
  }
  const cached = await store.getGraphQLSchema(graphqlRequest.value.url);
  graphqlSchema.value = cached?.schema;
  graphqlSchemaStatus.value = cached ? `Schema cached ${new Date(cached.lastFetched).toLocaleString()}` : "";
  expandedGraphQLTypeNames.value = graphqlSchema.value ? graphqlRootTypes.value.map((item) => item.type.name) : [];
}

async function introspectGraphQLSchema() {
  if (!graphqlRequest.value.url.trim()) return;
  graphqlSchemaStatus.value = "Introspecting schema...";
  try {
    const resolved = resolveGraphQLRequest(
      { ...graphqlRequest.value, query: GRAPHQL_INTROSPECTION_QUERY, variables: "{}", operationName: "IntrospectionQuery" },
      resolutionScopes.value
    );
    const result = await execute(graphQLToRequestConfig(resolved.request));
    const schema = parseGraphQLIntrospection(result.body);
    graphqlSchema.value = schema;
    expandedGraphQLTypeNames.value = rootGraphQLTypes(schema).map((item) => item.type.name);
    await store.saveGraphQLSchema({ endpoint: graphqlRequest.value.url, schema, lastFetched: Date.now() });
    graphqlSchemaStatus.value = `Schema loaded: ${schema.types.length} types`;
  } catch (error) {
    graphqlSchemaStatus.value = `Introspection failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function toggleGraphQLType(typeName: string) {
  expandedGraphQLTypeNames.value = expandedGraphQLTypeNames.value.includes(typeName)
    ? expandedGraphQLTypeNames.value.filter((name) => name !== typeName)
    : [...expandedGraphQLTypeNames.value, typeName];
}

function graphQLTypeFields(type?: GraphQLIntrospectionType) {
  return type?.fields ?? [];
}

function insertGraphQLField(field: GraphQLIntrospectionField) {
  const snippet = graphQLFieldSnippet(field);
  if (!gqlEditor.value) {
    graphqlRequest.value.query = `${graphqlRequest.value.query}\n${snippet}`;
    return;
  }
  gqlEditor.value.insertText(snippet);
}

async function refreshCodeSnippet() {
  const run = ++codeGenerationRun;
  codeLoading.value = true;
  try {
    const snippet = await generateCodeSnippet(codeExportRequest.value, codeTarget.value);
    if (run === codeGenerationRun) codeSnippet.value = snippet.code;
  } catch (error) {
    if (run === codeGenerationRun) codeSnippet.value = `Code export failed: ${String(error)}`;
  } finally {
    if (run === codeGenerationRun) codeLoading.value = false;
  }
}

async function copyCodeSnippet() {
  try {
    await navigator.clipboard.writeText(codeSnippet.value);
    status.value = "Code copied";
  } catch {
    const area = document.createElement("textarea");
    area.value = codeSnippet.value;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    status.value = "Code copied";
  }
}

function downloadCodeSnippet() {
  download(new Blob([codeSnippet.value], { type: "text/plain;charset=utf-8" }), codeExportMeta.value.filename);
}

function maybeParseCurl() {
  if (!request.value.url.trim().startsWith("curl ")) return;
  request.value = { ...request.value, ...parseCurl(request.value.url) };
}

async function exportCollection(collection: Collection) {
  const blob = await exportCollectionZip(
    collection,
    requests.value.filter((item) => item.collectionId === collection.id),
    folders.value.filter((item) => item.collectionId === collection.id)
  );
  download(blob, `${collection.name}.invoke.zip`);
}

async function importFiles(event: Event, kind: "yaml" | "postman" | "openapi" | "insomnia" | "hoppscotch") {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  if (files.length === 0) return;
  importPreview.error = "";
  importPreview.message = `Reading ${files[0].name}`;

  try {
    if (kind === "postman") {
      const doc = JSON.parse(await files[0].text());
      const imported = importPostmanCollection(doc);
      await persistImported(imported);
    } else if (kind === "insomnia") {
      const doc = JSON.parse(await files[0].text());
      const imported = importInsomniaExport(doc);
      await persistImported(imported);
    } else if (kind === "hoppscotch") {
      const doc = JSON.parse(await files[0].text());
      const imported = importHoppscotchCollection(doc);
      await persistImported(imported);
    } else if (kind === "openapi") {
      const imported = await importOpenApiSpec(await files[0].text(), files[0].name);
      await persistImported(imported);
    } else {
      const imported = await importYamlFiles(files);
      await persistImported(imported);
    }
    await refreshAll();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    importPreview.message = "";
    importPreview.error = message;
    status.value = `Import failed: ${message}`;
  } finally {
    input.value = "";
  }
}

function loadHistory(entry: HistoryEntry) {
  assertionRules.value = "assertions" in entry.request ? clone(entry.request.assertions ?? []) : [];
  extractRules.value = "extractionRules" in entry.request ? normalizeExtractionRules(entry.request.extractionRules) : [];
  assertionResults.value = clone(entry.assertions ?? []);
  if (entry.protocol === "graphql") {
    graphqlRequest.value = { ...emptyGraphQLRequest(), ...(JSON.parse(JSON.stringify(entry.request)) as GraphQLRequestConfig) };
    request.value = {
      ...emptyRequest(),
      id: entry.requestId,
      collectionId: entry.collectionId,
      protocol: "graphql",
      name: "History GraphQL request"
    };
    selectedTab.value = "graphql";
  } else if (entry.protocol === "websocket") {
    websocketRequest.value = { ...emptyWebSocketRequest(), ...(JSON.parse(JSON.stringify(entry.request)) as WebSocketRequestConfig) };
    request.value = {
      ...emptyRequest(),
      id: entry.requestId,
      collectionId: entry.collectionId,
      protocol: "websocket",
      name: "History WebSocket request"
    };
    selectedTab.value = "websocket";
  } else if (entry.protocol === "grpc") {
    grpcRequest.value = { ...emptyGrpcRequest(), ...(JSON.parse(JSON.stringify(entry.request)) as GrpcRequestConfig) };
    request.value = {
      ...emptyRequest(),
      id: entry.requestId,
      collectionId: entry.collectionId,
      protocol: "grpc",
      name: "History gRPC request"
    };
    selectedTab.value = "grpc";
  } else {
    request.value = { ...emptyRequest(), ...(JSON.parse(JSON.stringify(entry.request)) as RequestConfig) };
  }
  response.value = entry.response;
}

async function persistImported(imported: { collection: Collection; folders?: Folder[]; requests: SavedRequest[]; environments?: Environment[] }) {
  const collection = await store.createCollection(imported.collection.name, imported.collection);
  const folderIds = new Map<string, string>();
  for (const folder of imported.folders ?? []) {
    const parentFolderId = folder.parentFolderId ? folderIds.get(folder.parentFolderId) ?? null : null;
    const savedFolder = await store.createFolder(collection.id, folder.name, parentFolderId, folder);
    folderIds.set(folder.id, savedFolder.id);
  }
  for (const item of imported.requests) {
    await store.saveRequest(item.request as ProtocolRequestConfig, item.name, collection.id, {
      protocol: item.protocol,
      folderId: item.folderId ? folderIds.get(item.folderId) ?? null : null
    });
  }
  let firstEnvironmentId: string | undefined;
  for (const environment of imported.environments ?? []) {
    const savedEnvironment = await store.saveEnvironment(environment);
    firstEnvironmentId ??= savedEnvironment.id;
  }
  if (firstEnvironmentId && !activeEnvironmentId.value) {
    activeEnvironmentId.value = firstEnvironmentId;
    await store.setActiveEnvironmentId(firstEnvironmentId);
  }
  status.value = `Imported ${imported.requests.length} requests${imported.folders?.length ? ` in ${imported.folders.length} folders` : ""}${
    imported.environments?.length ? ` with ${imported.environments.length} environments` : ""
  }`;
  importPreview.message = status.value;
  importPreview.error = "";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function changedVariables(before: Record<string, string>, after: Record<string, string>) {
  return Object.fromEntries(Object.entries(after).filter(([key, value]) => before[key] !== value));
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="app" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <aside class="sidebar">
      <div class="brand">
        <button class="brand-main" title="Collapse sidebar" @click="sidebarCollapsed = !sidebarCollapsed">
          <span class="logo-mark">in</span>
          <span class="brand-copy"><strong>invoke</strong><small>local-first API client</small></span>
        </button>
        <button class="icon-button" data-testid="new-request" title="New request" @click="newRequest">+</button>
      </div>

      <div class="sidebar-layout">
        <nav class="nav-rail" aria-label="Invoke sections">
          <button :class="{ active: activeSideSection === 'collections' }" title="Collections" @click="activeSideSection = 'collections'">
            <span>C</span><small>{{ sidebarCount("collections") }}</small>
          </button>
          <button :class="{ active: activeSideSection === 'history' }" title="History" @click="activeSideSection = 'history'">
            <span>H</span><small>{{ sidebarCount("history") }}</small>
          </button>
          <button :class="{ active: activeSideSection === 'environments' }" title="Environments" @click="activeSideSection = 'environments'">
            <span>E</span><small>{{ sidebarCount("environments") }}</small>
          </button>
          <button :class="{ active: activeSideSection === 'flows' }" title="Flows" @click="activeSideSection = 'flows'">
            <span>F</span><small>{{ sidebarCount("flows") }}</small>
          </button>
          <button :class="{ active: activeSideSection === 'mocks' }" title="Mock server" @click="activeSideSection = 'mocks'">
            <span>M</span><small>{{ sidebarCount("mocks") }}</small>
          </button>
        </nav>

        <section v-if="!sidebarCollapsed" class="side-panel">
          <template v-if="activeSideSection === 'collections'">
            <div class="side-title">
              <span>Collections</span>
              <div>
                <button @click="createCollection">Collection</button>
                <button @click="newRequestIn(activeCollection?.id)">Request</button>
              </div>
            </div>
            <div class="import-strip">
              <label class="file-button">Postman<input ref="postmanFileInput" type="file" accept=".json" @change="importFiles($event, 'postman')" /></label>
              <label class="file-button">Invoke<input ref="invokeFileInput" type="file" multiple accept=".zip,.yaml,.yml" @change="importFiles($event, 'yaml')" /></label>
              <label class="file-button">OpenAPI<input ref="openApiFileInput" type="file" accept=".json,.yaml,.yml" @change="importFiles($event, 'openapi')" /></label>
              <label class="file-button">Insomnia<input ref="insomniaFileInput" type="file" accept=".json" @change="importFiles($event, 'insomnia')" /></label>
              <label class="file-button">Hoppscotch<input ref="hoppscotchFileInput" type="file" accept=".json" @change="importFiles($event, 'hoppscotch')" /></label>
            </div>
            <div
              v-if="importPreview.error || importPreview.message"
              class="import-preview"
              :class="{ error: importPreview.error }"
              data-testid="import-preview"
            >
              {{ importPreview.error || importPreview.message }}
            </div>

            <div
              v-for="group in groupedRequests"
              :key="group.collection.id"
              class="collection"
              @dragover.prevent
              @drop="dropOnCollection($event, group.collection.id)"
            >
              <div class="collection-row" data-testid="collection-row" @contextmenu.prevent="openCollectionContext($event, group.collection)">
                <button class="linkish" @click="selectCollection(group.collection.id)">{{ group.collection.name }}</button>
                <div>
                  <button title="New folder" @click="createFolderIn(group.collection.id)">Folder</button>
                  <button title="Export" @click="exportCollection(group.collection)">Export</button>
                </div>
              </div>
              <FolderTreeNode
                v-for="node in group.folders"
                :key="node.folder.id"
                :node="node"
                :active-request-id="request.id"
                :expanded-folder-ids="expandedFolderIds"
                @toggle="toggleFolder"
                @load="loadRequest"
                @folder-context="openFolderContext"
                @request-context="openRequestContext"
                @drag-start="startTreeDrag"
                @drag-end="endTreeDrag"
                @drop-folder="dropOnFolder"
                @drop-request="dropBeforeRequest"
              />
              <button
                v-for="saved in group.requests"
                :key="saved.id"
                class="request-row"
                :class="{ active: request.id === saved.id }"
                draggable="true"
                @click="loadRequest(saved)"
                @contextmenu.prevent="openRequestContext($event, saved)"
                @dragstart="startTreeDrag($event, { type: 'request', id: saved.id })"
                @dragend="endTreeDrag"
                @dragover.prevent
                @drop="dropBeforeRequest($event, saved)"
              >
                <span :data-method="savedMethod(saved)">{{ savedMethod(saved) }}</span>
                <strong>{{ saved.name }}</strong>
                <small @click.stop="deleteRequest(saved)">x</small>
              </button>
            </div>

            <section class="inline-history">
              <div class="side-title inline-title"><span>History</span><button @click="activeSideSection = 'history'">Open</button></div>
              <input v-model="historyQuery" class="history-search" data-testid="history-search" placeholder="Search history" />
              <button v-for="entry in displayedHistory.slice(0, 8)" :key="entry.id" class="history-row" @click="loadHistory(entry)">
                <span :data-method="historyMethod(entry)">{{ historyMethod(entry) }}</span>
                <strong>{{ historyUrl(entry) }}</strong>
                <small>{{ entry.response?.status ?? "-" }} {{ historyAssertionLabel(entry) }}</small>
              </button>
              <p v-if="displayedHistory.length === 0" class="history-empty">No matching history</p>
            </section>
          </template>

          <template v-if="activeSideSection === 'history'">
            <div class="side-title"><span>History</span><button @click="historyQuery = ''">Clear</button></div>
            <div class="diff-controls">
              <select v-model="diffLeftId" data-testid="diff-left">
                <option value="">Left</option>
                <option v-for="entry in diffableHistory" :key="`left-${entry.id}`" :value="entry.id">{{ historyMethod(entry) }} {{ entry.response?.status ?? "-" }} {{ new Date(entry.createdAt).toLocaleTimeString() }}</option>
              </select>
              <select v-model="diffRightId" data-testid="diff-right">
                <option value="">Right</option>
                <option v-for="entry in diffableHistory" :key="`right-${entry.id}`" :value="entry.id">{{ historyMethod(entry) }} {{ entry.response?.status ?? "-" }} {{ new Date(entry.createdAt).toLocaleTimeString() }}</option>
              </select>
              <button :disabled="!diffLeftId || !diffRightId || diffLeftId === diffRightId" data-testid="compare-history" @click="compareSelectedHistory">Compare</button>
            </div>
            <input v-model="historyQuery" class="history-search" data-testid="history-search" placeholder="Search history" />
            <button v-for="entry in displayedHistory" :key="entry.id" class="history-row" @click="loadHistory(entry)">
              <span :data-method="historyMethod(entry)">{{ historyMethod(entry) }}</span>
              <strong>{{ historyUrl(entry) }}</strong>
              <small>{{ entry.response?.status ?? "-" }} {{ historyAssertionLabel(entry) }}</small>
            </button>
            <p v-if="displayedHistory.length === 0" class="history-empty">No matching history</p>
          </template>

          <template v-if="activeSideSection === 'environments'">
            <div class="side-title"><span>Environments</span><button @click="editEnvironment()">New</button></div>
            <select :value="activeEnvironmentId" @change="setActiveEnvironment(($event.target as HTMLSelectElement).value || undefined)">
              <option value="">No environment</option>
              <option v-for="env in environments" :key="env.id" :value="env.id">{{ env.name }}</option>
            </select>
            <button :disabled="!activeEnvironment" @click="editEnvironment(activeEnvironment)">Edit selected</button>
            <div class="env-list">
              <button v-for="env in environments" :key="env.id" :class="{ active: env.id === activeEnvironmentId }" @click="setActiveEnvironment(env.id)">
                <strong>{{ env.name }}</strong>
                <small>{{ env.variables.filter((item) => item.enabled !== false).length }} variables</small>
              </button>
              <p v-if="environments.length === 0" class="history-empty">No environments yet</p>
            </div>
          </template>

          <template v-if="activeSideSection === 'flows'">
            <div class="side-title"><span>Flows</span><button @click="newFlow">New</button></div>
            <div class="flow-quick">
              <label>Name<input v-model="flowDraft.name" /></label>
              <div>
                <button @click="addFlowRequestStep()">Add current</button>
                <button @click="addFlowDelayStep">Delay</button>
              </div>
              <div>
                <button @click="saveFlowDraft">Save</button>
                <button :disabled="flowRunning || flowDraft.steps.length === 0" @click="runFlowDraft">{{ flowRunning ? "Running" : "Run" }}</button>
              </div>
              <small v-if="flowResult" :class="flowResult.status === 'passed' ? 'ok' : 'bad'">{{ flowResult.status }} · {{ flowResult.steps.length }} steps</small>
            </div>
            <div class="flow-list compact-list">
              <article v-for="flow in flows" :key="flow.id" :class="{ active: flow.id === flowDraft.id }">
                <button @click="loadFlow(flow)"><strong>{{ flow.name }}</strong><small>{{ flow.steps.length }} steps</small></button>
                <button :disabled="flowRunning" @click="runSavedFlow(flow)">Run</button>
              </article>
              <p v-if="flows.length === 0" class="history-empty">No saved flows</p>
            </div>
            <div class="flow-log">
              <article v-for="entry in flowLog.slice(0, 6)" :key="entry">{{ entry }}</article>
            </div>
          </template>

          <template v-if="activeSideSection === 'mocks'">
            <div class="side-title"><span>Mock Server</span><button @click="addMockRoute">Route</button></div>
            <p class="mock-status"><span :class="mockRoutes.length ? 'ok-dot' : 'warn-dot'"></span>{{ mockStatus || "Not synced" }}</p>
            <div class="mock-actions">
              <button @click="saveMockRoutes">Sync</button>
              <button @click="refreshMockLogs">Logs</button>
              <button @click="clearMockServerLogs">Clear</button>
            </div>
            <article v-for="(route, index) in mockRoutes" :key="route.id" class="mock-route compact-route">
              <label class="check"><input v-model="route.enabled" type="checkbox" /> on</label>
              <select v-model="route.method">
                <option v-for="method in methods" :key="method" :value="method">{{ method }}</option>
              </select>
              <input v-model="route.pathPattern" placeholder="/users/:id" />
              <input v-model.number="route.status" type="number" min="100" max="599" />
              <button @click="removeAt(mockRoutes, index)">Remove</button>
            </article>
            <div class="mock-logs">
              <article v-for="entry in mockLogs.slice(0, 12)" :key="entry.id">
                <span :data-method="entry.method">{{ entry.method }}</span>
                <strong>{{ entry.path }}</strong>
                <small>{{ entry.status }}</small>
              </article>
              <p v-if="mockLogs.length === 0" class="history-empty">No mock traffic</p>
            </div>
          </template>
        </section>
      </div>
    </aside>

    <main class="workspace">
      <header class="request-line">
        <div class="protocol-tabs">
          <select class="protocol-select-shadow" :value="activeProtocol" data-testid="protocol-select" @change="setProtocol(($event.target as HTMLSelectElement).value as RequestProtocol)">
            <option v-for="protocol in protocols" :key="protocol" :value="protocol">{{ protocolLabel(protocol) }}</option>
          </select>
          <button v-for="protocol in protocols" :key="protocol" :class="{ active: activeProtocol === protocol }" @click="setProtocol(protocol)">
            {{ protocolLabel(protocol) }}
          </button>
        </div>
        <select v-if="activeProtocol === 'rest'" v-model="request.method" class="method-select" :class="methodClass(request.method)" data-testid="method-select">
          <option v-for="method in methods" :key="method" :value="method">{{ method }}</option>
        </select>
        <div class="url-shell">
          <input
            v-if="activeProtocol === 'rest'"
            v-model="request.url"
            data-testid="url-input"
            placeholder="https://api.example.com/users or paste cURL"
            @blur="maybeParseCurl"
          />
          <input v-if="activeProtocol === 'graphql'" v-model="graphqlRequest.url" data-testid="graphql-url-input" placeholder="https://api.example.com/graphql" />
          <input v-if="activeProtocol === 'websocket'" v-model="websocketRequest.url" data-testid="websocket-url-input" placeholder="wss://echo.websocket.events" />
          <input v-if="activeProtocol === 'grpc'" v-model="grpcRequest.address" data-testid="grpc-address-input" placeholder="localhost:50051" />
          <div v-if="urlParts().some((part) => part.variable)" class="url-vars" aria-hidden="true">
            <template v-for="(part, index) in urlParts()" :key="index">
              <span :class="{ variable: part.variable }">{{ part.text }}</span>
            </template>
          </div>
        </div>
        <label v-if="activeProtocol !== 'websocket' && activeProtocol !== 'grpc'" class="stream-toggle"><input v-model="streamMode" type="checkbox" /> Stream</label>
        <button class="send" data-testid="send-request" :disabled="loading || websocketState === 'connecting'" @click="send">
          {{ activeProtocol === "websocket" ? (websocketState === "connected" ? "Disconnect" : "Connect") : activeProtocol === "grpc" ? (loading ? "Invoking" : "Invoke") : loading ? "Sending" : "Send" }}
        </button>
        <button v-if="streaming" data-testid="stop-stream" @click="stopStream">Stop</button>
        <button data-testid="save-request" @click="openSave">Save</button>
        <button class="kbd-button" data-testid="open-command-palette" title="Command palette" @click="openCommandPalette()">⌘K</button>
        <button class="icon-button" title="Toggle theme" @click="theme = theme === 'dark' ? 'light' : 'dark'">{{ theme === "dark" ? "sun" : "moon" }}</button>
        <button class="icon-button" data-testid="open-help" title="Help" @click="showHelp = true">?</button>
        <button class="icon-button" title="Settings" @click="showSettings = true">gear</button>
      </header>

      <section class="request-meta">
        <span class="status">{{ status }}</span>
        <span>Environment: {{ activeEnvironment?.name ?? "No environment" }}</span>
        <button data-testid="new-env" @click="editEnvironment()">New env</button>
        <button data-testid="edit-env" :disabled="!activeEnvironment" @click="editEnvironment(activeEnvironment)">Edit env</button>
        <span>Protocol: {{ protocolLabel(activeProtocol) }}</span>
        <button :disabled="!diffResult" @click="showDiffModal = true">Compare response</button>
      </section>

      <section v-if="resolution.unresolved.length" class="warning">
        Unresolved variables: {{ resolution.unresolved.join(", ") }}
      </section>

      <section class="panes">
        <div class="panel">
          <nav class="tabs">
            <button v-if="activeProtocol === 'rest'" :class="{ active: selectedTab === 'params' }" @click="selectedTab = 'params'">Params</button>
            <button :class="{ active: selectedTab === 'headers' }" @click="selectedTab = 'headers'">{{ activeProtocol === "grpc" ? "Metadata" : "Headers" }}</button>
            <button v-if="activeProtocol !== 'grpc'" :class="{ active: selectedTab === 'auth' }" @click="selectedTab = 'auth'">Auth</button>
            <button v-if="activeProtocol === 'rest'" :class="{ active: selectedTab === 'body' }" @click="selectedTab = 'body'">Body</button>
            <button v-if="activeProtocol === 'graphql'" :class="{ active: selectedTab === 'graphql' }" @click="selectedTab = 'graphql'">Query</button>
            <button
              v-if="activeProtocol === 'graphql'"
              :class="{ active: selectedTab === 'graphqlVariables' }"
              @click="selectedTab = 'graphqlVariables'"
            >
              Variables
            </button>
            <button v-if="activeProtocol === 'websocket'" :class="{ active: selectedTab === 'websocket' }" @click="selectedTab = 'websocket'">Messages</button>
            <button v-if="activeProtocol === 'grpc'" :class="{ active: selectedTab === 'grpc' }" @click="selectedTab = 'grpc'">RPC</button>
            <button v-if="activeProtocol !== 'websocket'" :class="{ active: selectedTab === 'assertions' }" @click="selectedTab = 'assertions'">Assertions</button>
            <button v-if="showExtractTab && activeProtocol !== 'websocket'" :class="{ active: selectedTab === 'extract' }" @click="selectedTab = 'extract'">Extract</button>
            <button :class="{ active: selectedTab === 'scripts' }" @click="selectedTab = 'scripts'">Scripts</button>
          </nav>

          <div v-if="activeProtocol === 'rest' && selectedTab === 'params'" class="editor">
            <KeyValueEditor :items="request.params" @add="addKeyValue(request.params)" @remove="removeAt(request.params, $event)" />
          </div>
          <div v-if="selectedTab === 'headers'" class="editor">
            <KeyValueEditor
              v-if="activeProtocol === 'rest'"
              :items="request.headers"
              @add="addKeyValue(request.headers)"
              @remove="removeAt(request.headers, $event)"
            />
            <KeyValueEditor
              v-else-if="activeProtocol === 'graphql'"
              :items="graphqlRequest.headers"
              @add="addKeyValue(graphqlRequest.headers)"
              @remove="removeAt(graphqlRequest.headers, $event)"
            />
            <KeyValueEditor
              v-else-if="activeProtocol === 'websocket'"
              :items="websocketRequest.headers"
              @add="addKeyValue(websocketRequest.headers)"
              @remove="removeAt(websocketRequest.headers, $event)"
            />
            <KeyValueEditor
              v-else
              :items="grpcRequest.metadata"
              @add="addKeyValue(grpcRequest.metadata)"
              @remove="removeAt(grpcRequest.metadata, $event)"
            />
          </div>
          <div v-if="selectedTab === 'auth'" class="editor form-grid">
            <template v-if="activeProtocol === 'rest'">
              <label>Type<select v-model="request.auth.type" data-testid="auth-type"><option v-for="type in activeAuthTypes" :key="type" :value="type">{{ type }}</option></select></label>
              <template v-if="request.auth.type === 'basic' || request.auth.type === 'digest'">
                <label>Username<input v-model="request.auth.username" /></label>
                <label>Password<input v-model="request.auth.password" type="password" /></label>
              </template>
              <template v-if="request.auth.type === 'bearer'">
                <label>Token<input v-model="request.auth.token" data-testid="bearer-token" /></label>
              </template>
              <template v-if="request.auth.type === 'oauth2'">
                <label>Token URL<input v-model="request.auth.tokenUrl" placeholder="https://auth.example.com/oauth/token" /></label>
                <label>Client ID<input v-model="request.auth.clientId" /></label>
                <label>Client Secret<input v-model="request.auth.clientSecret" type="password" /></label>
                <label>Scope<input v-model="request.auth.scope" placeholder="read write" /></label>
              </template>
              <template v-if="request.auth.type === 'aws-sigv4'">
                <label>Access key<input v-model="request.auth.awsAccessKeyId" /></label>
                <label>Secret key<input v-model="request.auth.awsSecretAccessKey" type="password" /></label>
                <label>Session token<input v-model="request.auth.awsSessionToken" /></label>
                <label>Region<input v-model="request.auth.awsRegion" placeholder="us-east-1" /></label>
                <label>Service<input v-model="request.auth.awsService" placeholder="execute-api" /></label>
              </template>
              <template v-if="request.auth.type === 'api-key'">
                <label>Name<input v-model="request.auth.apiKeyName" /></label>
                <label>Value<input v-model="request.auth.apiKeyValue" /></label>
                <label>Location<select v-model="request.auth.apiKeyIn"><option value="header">header</option><option value="query">query</option></select></label>
              </template>
            </template>
            <template v-else-if="activeProtocol === 'graphql'">
              <label>Type<select v-model="graphqlRequest.auth.type" data-testid="auth-type"><option v-for="type in activeAuthTypes" :key="type" :value="type">{{ type }}</option></select></label>
              <template v-if="graphqlRequest.auth.type === 'basic' || graphqlRequest.auth.type === 'digest'">
                <label>Username<input v-model="graphqlRequest.auth.username" /></label>
                <label>Password<input v-model="graphqlRequest.auth.password" type="password" /></label>
              </template>
              <template v-if="graphqlRequest.auth.type === 'bearer'">
                <label>Token<input v-model="graphqlRequest.auth.token" data-testid="bearer-token" /></label>
              </template>
              <template v-if="graphqlRequest.auth.type === 'oauth2'">
                <label>Token URL<input v-model="graphqlRequest.auth.tokenUrl" placeholder="https://auth.example.com/oauth/token" /></label>
                <label>Client ID<input v-model="graphqlRequest.auth.clientId" /></label>
                <label>Client Secret<input v-model="graphqlRequest.auth.clientSecret" type="password" /></label>
                <label>Scope<input v-model="graphqlRequest.auth.scope" placeholder="read write" /></label>
              </template>
              <template v-if="graphqlRequest.auth.type === 'aws-sigv4'">
                <label>Access key<input v-model="graphqlRequest.auth.awsAccessKeyId" /></label>
                <label>Secret key<input v-model="graphqlRequest.auth.awsSecretAccessKey" type="password" /></label>
                <label>Session token<input v-model="graphqlRequest.auth.awsSessionToken" /></label>
                <label>Region<input v-model="graphqlRequest.auth.awsRegion" placeholder="us-east-1" /></label>
                <label>Service<input v-model="graphqlRequest.auth.awsService" placeholder="execute-api" /></label>
              </template>
              <template v-if="graphqlRequest.auth.type === 'api-key'">
                <label>Name<input v-model="graphqlRequest.auth.apiKeyName" /></label>
                <label>Value<input v-model="graphqlRequest.auth.apiKeyValue" /></label>
                <label>Location<select v-model="graphqlRequest.auth.apiKeyIn"><option value="header">header</option><option value="query">query</option></select></label>
              </template>
            </template>
            <template v-else-if="activeProtocol === 'websocket'">
              <label>Type<select v-model="websocketRequest.auth.type" data-testid="auth-type"><option v-for="type in activeAuthTypes" :key="type" :value="type">{{ type }}</option></select></label>
              <template v-if="websocketRequest.auth.type === 'basic' || websocketRequest.auth.type === 'digest'">
                <label>Username<input v-model="websocketRequest.auth.username" /></label>
                <label>Password<input v-model="websocketRequest.auth.password" type="password" /></label>
              </template>
              <template v-if="websocketRequest.auth.type === 'bearer'">
                <label>Token<input v-model="websocketRequest.auth.token" data-testid="bearer-token" /></label>
              </template>
              <template v-if="websocketRequest.auth.type === 'oauth2'">
                <label>Token URL<input v-model="websocketRequest.auth.tokenUrl" placeholder="https://auth.example.com/oauth/token" /></label>
                <label>Client ID<input v-model="websocketRequest.auth.clientId" /></label>
                <label>Client Secret<input v-model="websocketRequest.auth.clientSecret" type="password" /></label>
                <label>Scope<input v-model="websocketRequest.auth.scope" placeholder="read write" /></label>
              </template>
              <template v-if="websocketRequest.auth.type === 'aws-sigv4'">
                <label>Access key<input v-model="websocketRequest.auth.awsAccessKeyId" /></label>
                <label>Secret key<input v-model="websocketRequest.auth.awsSecretAccessKey" type="password" /></label>
                <label>Session token<input v-model="websocketRequest.auth.awsSessionToken" /></label>
                <label>Region<input v-model="websocketRequest.auth.awsRegion" placeholder="us-east-1" /></label>
                <label>Service<input v-model="websocketRequest.auth.awsService" placeholder="execute-api" /></label>
              </template>
              <template v-if="websocketRequest.auth.type === 'api-key'">
                <label>Name<input v-model="websocketRequest.auth.apiKeyName" /></label>
                <label>Value<input v-model="websocketRequest.auth.apiKeyValue" /></label>
                <label>Location<select v-model="websocketRequest.auth.apiKeyIn"><option value="header">header</option><option value="query">query</option></select></label>
              </template>
            </template>
            <section class="tls-client-settings">
              <label class="check"><input v-model="activeOptions.verifySsl" type="checkbox" /> Verify TLS certificates</label>
              <label>Server name<input v-model="activeOptions.tlsClientConfig!.serverName" placeholder="api.example.com" /></label>
              <label>Client cert PEM<textarea v-model="activeOptions.tlsClientConfig!.clientCertPem" spellcheck="false" placeholder="-----BEGIN CERTIFICATE-----" /></label>
              <label>Client key PEM<textarea v-model="activeOptions.tlsClientConfig!.clientKeyPem" spellcheck="false" placeholder="-----BEGIN PRIVATE KEY-----" /></label>
              <label>CA cert PEM<textarea v-model="activeOptions.tlsClientConfig!.caCertPem" spellcheck="false" placeholder="-----BEGIN CERTIFICATE-----" /></label>
            </section>
          </div>
          <div v-if="activeProtocol === 'rest' && selectedTab === 'body'" class="editor">
            <select v-model="request.bodyMode" data-testid="body-mode">
              <option v-for="mode in bodyModes" :key="mode" :value="mode">{{ mode }}</option>
            </select>
            <textarea v-model="request.body" spellcheck="false" placeholder="{ }" />
          </div>
          <div v-if="activeProtocol === 'graphql' && selectedTab === 'graphql'" class="editor graphql-editor">
            <div class="graphql-toolbar">
              <label>Operation name<input v-model="graphqlRequest.operationName" data-testid="graphql-operation-input" placeholder="Optional" /></label>
              <button data-testid="graphql-introspect" :disabled="!graphqlRequest.url || loading" @click="introspectGraphQLSchema">Introspect schema</button>
              <small>{{ graphqlSchemaStatus }}</small>
            </div>
            <div class="graphql-workbench">
              <GraphQLEditor ref="gqlEditor" v-model="graphqlRequest.query" :schema="graphqlSchema" />
              <aside class="schema-explorer" data-testid="graphql-schema-explorer">
                <strong>Schema</strong>
                <p v-if="!graphqlSchema" class="muted">No schema loaded</p>
                <section v-for="root in graphqlRootTypes" :key="root.label">
                  <button class="schema-type" @click="toggleGraphQLType(root.type.name)">
                    {{ root.label }} <small>{{ root.type.name }}</small>
                  </button>
                  <div v-if="expandedGraphQLTypeNames.includes(root.type.name)" class="schema-fields">
                    <button v-for="field in graphQLTypeFields(root.type)" :key="field.name" @click="insertGraphQLField(field)">
                      <span>{{ field.name }}</span><small>{{ formatGraphQLTypeRef(field.type) }}</small>
                    </button>
                  </div>
                </section>
                <section v-for="type in graphqlPublicTypes.slice(0, 40)" :key="type.name">
                  <button class="schema-type" @click="toggleGraphQLType(type.name)">
                    {{ type.name }} <small>{{ type.kind }}</small>
                  </button>
                  <div v-if="expandedGraphQLTypeNames.includes(type.name)" class="schema-fields">
                    <button v-for="field in graphQLTypeFields(type)" :key="field.name" @click="insertGraphQLField(field)">
                      <span>{{ field.name }}</span><small>{{ formatGraphQLTypeRef(field.type) }}</small>
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          </div>
          <div v-if="activeProtocol === 'graphql' && selectedTab === 'graphqlVariables'" class="editor graphql-editor">
            <textarea v-model="graphqlRequest.variables" data-testid="graphql-variables-input" spellcheck="false" placeholder="{ }" />
          </div>
          <div v-if="activeProtocol === 'websocket' && selectedTab === 'websocket'" class="editor websocket-editor">
            <div class="websocket-toolbar">
              <label>Protocols<input v-model="websocketRequest.protocols" placeholder="graphql-ws, json" /></label>
              <label>Timeout<input v-model.number="websocketRequest.timeoutMs" type="number" min="1000" step="1000" /></label>
              <strong :class="websocketState === 'connected' ? 'ok' : websocketState === 'connecting' ? 'warn' : 'bad'">{{ websocketState }}</strong>
            </div>
            <div class="websocket-compose">
              <select v-model="websocketRequest.messageMode">
                <option value="text">text</option>
                <option value="json">json</option>
              </select>
              <button :disabled="websocketState !== 'connected'" data-testid="websocket-send" @click="sendWebSocketMessage">Send message</button>
            </div>
            <textarea v-model="websocketRequest.message" data-testid="websocket-message" spellcheck="false" placeholder="{ }" />
            <div class="websocket-log" data-testid="websocket-log">
              <article v-for="item in websocketLog" :key="item.id" :class="`ws-${item.direction}`">
                <strong>{{ item.direction }}</strong>
                <span>{{ item.type }}</span>
                <small>{{ new Date(item.createdAt).toLocaleTimeString() }}</small>
                <pre>{{ item.body }}</pre>
              </article>
            </div>
          </div>
          <div v-if="activeProtocol === 'grpc' && selectedTab === 'grpc'" class="editor grpc-editor">
            <div class="grpc-toolbar">
              <label class="check"><input v-model="grpcRequest.tls" type="checkbox" /> TLS</label>
              <label class="check"><input v-model="activeOptions.verifySsl" type="checkbox" /> Verify TLS certificates</label>
              <label>Timeout<input v-model.number="grpcRequest.timeoutMs" type="number" min="1000" step="1000" /></label>
              <button data-testid="grpc-reflect" :disabled="!grpcRequest.address || loading" @click="reflectGrpcMethods">Reflect</button>
              <small>{{ grpcStatus }}</small>
            </div>
            <div class="form-grid">
              <label>Service<input v-model="grpcRequest.service" data-testid="grpc-service-input" placeholder="package.Service" /></label>
              <label>Method<input v-model="grpcRequest.method" data-testid="grpc-method-input" placeholder="MethodName" /></label>
              <label>Server name<input v-model="activeOptions.tlsClientConfig!.serverName" placeholder="Override TLS SNI" /></label>
            </div>
            <div class="grpc-workbench">
              <textarea v-model="grpcRequest.body" data-testid="grpc-body-input" spellcheck="false" placeholder="{ }" />
              <aside class="grpc-methods">
                <strong>Methods</strong>
                <button v-for="method in grpcMethods" :key="method.fullMethod" @click="selectGrpcMethod(method)">
                  <span>{{ method.service }}/{{ method.method }}</span>
                  <small>{{ method.inputType }} -> {{ method.outputType }}</small>
                </button>
              </aside>
            </div>
            <section class="tls-client-settings">
              <label>Client cert PEM<textarea v-model="activeOptions.tlsClientConfig!.clientCertPem" spellcheck="false" placeholder="-----BEGIN CERTIFICATE-----" /></label>
              <label>Client key PEM<textarea v-model="activeOptions.tlsClientConfig!.clientKeyPem" spellcheck="false" placeholder="-----BEGIN PRIVATE KEY-----" /></label>
              <label>CA cert PEM<textarea v-model="activeOptions.tlsClientConfig!.caCertPem" spellcheck="false" placeholder="-----BEGIN CERTIFICATE-----" /></label>
            </section>
          </div>
          <div v-if="selectedTab === 'assertions'" class="editor assertion-editor">
            <div v-for="(assertion, index) in assertionRules" :key="assertion.id" class="assertion-row">
              <label class="check"><input v-model="assertion.enabled" type="checkbox" /> on</label>
              <select v-model="assertion.type" data-testid="assertion-type">
                <option v-for="type in assertionTypes" :key="type" :value="type">{{ type }}</option>
              </select>
              <input v-model="assertion.expression" data-testid="assertion-expression" placeholder="status/header/JSONPath/schema" />
              <select v-model="assertion.matcher" data-testid="assertion-matcher">
                <option v-for="matcher in assertionMatchers" :key="matcher" :value="matcher">{{ matcher }}</option>
              </select>
              <input v-model="assertion.expected" data-testid="assertion-expected" placeholder="expected" />
              <button @click="removeAt(assertionRules, index)">Remove</button>
            </div>
            <button data-testid="add-assertion" @click="addAssertion">Add assertion</button>
          </div>
          <div v-if="showExtractTab && selectedTab === 'extract'" class="editor">
            <div v-for="(rule, index) in extractRules" :key="rule.id ?? index" class="extraction-row">
              <label class="check"><input v-model="rule.enabled" type="checkbox" /> on</label>
              <input v-model="rule.variableName" placeholder="variable_name" />
              <select v-model="rule.source">
                <option v-for="source in extractionSources" :key="source" :value="source">{{ source }}</option>
              </select>
              <input v-model="rule.expression" placeholder="$.token or Authorization" />
              <input v-model="rule.fallback" placeholder="fallback" />
              <button @click="removeAt(extractRules, index)">Remove</button>
            </div>
            <button @click="addExtraction">Add extraction</button>
            <pre class="session-vars">{{ sessionVariables }}</pre>
          </div>
          <div v-if="selectedTab === 'scripts'" class="editor script-editor">
            <template v-if="activeProtocol === 'rest'">
              <label>Pre-request<textarea v-model="request.scripts!.preRequest" spellcheck="false" placeholder="invoke.setHeader('X-Trace', invoke.uuid())" /></label>
              <label>Post-response<textarea v-model="request.scripts!.postResponse" spellcheck="false" placeholder="variables.set('token', response.body)" /></label>
            </template>
            <template v-if="activeProtocol === 'graphql'">
              <label>Pre-request<textarea v-model="graphqlRequest.scripts!.preRequest" spellcheck="false" placeholder="variables.set('trace', invoke.uuid())" /></label>
              <label>Post-response<textarea v-model="graphqlRequest.scripts!.postResponse" spellcheck="false" placeholder="variables.set('token', response.body)" /></label>
            </template>
            <template v-if="activeProtocol === 'websocket'">
              <label>Pre-connect<textarea v-model="websocketRequest.scripts!.preRequest" spellcheck="false" placeholder="invoke.request.message = JSON.stringify({ ping: invoke.uuid() })" /></label>
            </template>
            <template v-if="activeProtocol === 'grpc'">
              <label>Pre-invoke<textarea v-model="grpcRequest.scripts!.preRequest" spellcheck="false" placeholder="invoke.request.body = JSON.stringify({ id: variables.get('id') })" /></label>
              <label>Post-response<textarea v-model="grpcRequest.scripts!.postResponse" spellcheck="false" placeholder="variables.set('grpc_status', response.status)" /></label>
            </template>
            <pre class="session-vars">{{ scriptLogs }}</pre>
          </div>
        </div>

        <div class="panel response response-pane">
          <div class="response-head">
            <div>
              <strong :class="[statusClass, statusTone(response?.status)]" data-testid="response-status">{{ response?.status ? `${response.status} ${response.statusText}` : "No response" }}</strong>
              <span>{{ response?.timing?.totalMs ? `${Math.round(response.timing.totalMs)} ms` : "" }}</span>
              <span>{{ response?.responseSize ? `${response.responseSize} bytes` : "" }}</span>
            </div>
            <div>
              <span v-if="streaming" class="streaming-badge">streaming... {{ streamBytes }} bytes</span>
              <span v-if="assertionSummary.total" :class="assertionSummary.failed ? 'bad' : 'ok'">{{ assertionSummary.passed }}/{{ assertionSummary.total }} assertions passed</span>
              <button :disabled="!diffResult" @click="showDiffModal = true">Compare</button>
            </div>
          </div>
          <nav class="tabs">
            <button :class="{ active: responseTab === 'body' }" @click="responseTab = 'body'">Body</button>
            <button :class="{ active: responseTab === 'headers' }" @click="responseTab = 'headers'">Headers</button>
            <button :class="{ active: responseTab === 'timing' }" @click="responseTab = 'timing'">Timing</button>
            <button :class="{ active: responseTab === 'tls' }" @click="responseTab = 'tls'">TLS</button>
            <button :class="{ active: responseTab === 'assertions' }" @click="responseTab = 'assertions'">Assertions</button>
            <button :class="{ active: responseTab === 'code' }" @click="responseTab = 'code'">Code</button>
          </nav>
          <div v-if="responseTab === 'body'" class="response-body-panel">
            <div class="response-tools">
              <div class="segmented-control">
                <button :class="{ active: responsePretty }" @click="responsePretty = true">Pretty</button>
                <button :class="{ active: !responsePretty }" @click="responsePretty = false">Raw</button>
              </div>
              <input v-model="responseSearch" placeholder="Search response" />
            </div>
            <pre class="body-view" data-testid="response-body">{{ response?.error || responseDisplayBody }}</pre>
          </div>
          <table v-if="responseTab === 'headers'">
            <tbody><tr v-for="header in response?.headers ?? []" :key="header.key"><th>{{ header.key }}</th><td>{{ header.value }}</td></tr></tbody>
          </table>
          <TimingWaterfall v-if="responseTab === 'timing'" :response="response" />
          <div v-if="responseTab === 'tls'" class="tls-view">
            <p>{{ response?.tls?.version }} {{ response?.tls?.cipherSuite }}</p>
            <article v-for="cert in response?.tls?.certificates ?? []" :key="cert.sha256Fingerprint">
              <strong>{{ cert.subject }}</strong>
              <span>Issuer: {{ cert.issuer }}</span>
              <span>Valid: {{ cert.notBefore }} to {{ cert.notAfter }}</span>
              <code>{{ cert.sha256Fingerprint }}</code>
            </article>
          </div>
          <div v-if="responseTab === 'assertions'" class="assertion-results" data-testid="assertion-results">
            <p v-if="assertionResults.length === 0" class="empty-timing">No assertions have run for this response.</p>
            <article v-for="result in assertionResults" :key="result.assertionId" :class="{ failed: !result.passed }">
              <strong :class="result.passed ? 'ok' : 'bad'">{{ result.passed ? "pass" : "fail" }}</strong>
              <span>{{ assertionLabel(result.assertionId) }}</span>
              <small v-if="!result.passed">{{ result.message }}</small>
            </article>
          </div>
          <div v-if="responseTab === 'code'" class="code-export" data-testid="code-export">
            <div class="code-toolbar">
              <select v-model="codeTarget" data-testid="code-target">
                <option v-for="target in CODE_EXPORT_TARGETS" :key="target.target" :value="target.target">{{ target.label }}</option>
              </select>
              <button data-testid="copy-code" :disabled="codeLoading || !codeSnippet" @click="copyCodeSnippet">Copy</button>
              <button data-testid="save-code" :disabled="codeLoading || !codeSnippet" @click="downloadCodeSnippet">Save</button>
            </div>
            <CodeViewer :code="codeLoading ? 'Generating...' : codeSnippet" :language="codeExportMeta.language" />
          </div>
        </div>
      </section>
    </main>

    <div v-if="commandPaletteOpen" class="overlay" data-testid="command-palette" @click.self="commandPaletteOpen = false">
      <section class="command-palette" @keydown.stop>
        <input
          ref="commandInput"
          v-model="commandQuery"
          data-testid="command-input"
          placeholder="Search commands, requests, folders, history"
          @keydown.down.prevent="movePaletteSelection(1)"
          @keydown.up.prevent="movePaletteSelection(-1)"
          @keydown.enter.prevent="runSelectedPaletteItem()"
          @keydown.esc.prevent="commandPaletteOpen = false"
        />
        <div class="command-results">
          <button
            v-for="(item, index) in paletteResults"
            :key="item.id"
            class="command-row"
            :class="{ active: index === selectedCommandIndex }"
            data-testid="command-result"
            @mouseenter="selectedCommandIndex = index"
            @click="runSelectedPaletteItem(item)"
          >
            <span class="command-kind">{{ item.kind }}</span>
            <span class="command-method" :data-method="item.method || ''">{{ item.method || "" }}</span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.subtitle }}</small>
          </button>
          <p v-if="paletteResults.length === 0" class="command-empty">No matching command</p>
        </div>
      </section>
    </div>

    <div v-if="showHelp" class="overlay" data-testid="shortcut-help" @click.self="showHelp = false">
      <section class="modal help-modal">
        <header>
          <h2>Shortcuts</h2>
          <button @click="showHelp = false">Close</button>
        </header>
        <table>
          <tbody>
            <tr v-for="shortcut in shortcutRows" :key="shortcut.keys">
              <th>{{ shortcut.keys }}</th>
              <td>{{ shortcut.action }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <div v-if="showSettings" class="overlay" data-testid="settings-panel" @click.self="showSettings = false">
      <section class="modal settings-modal">
        <header>
          <h2>Settings</h2>
          <button @click="showSettings = false">Close</button>
        </header>
        <div class="settings-grid">
          <label>
            Theme
            <select v-model="theme">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label v-if="activeProtocol === 'rest'">Default timeout<input v-model.number="request.timeoutMs" type="number" min="100" step="500" /></label>
          <label v-if="activeProtocol === 'graphql'">Default timeout<input v-model.number="graphqlRequest.timeoutMs" type="number" min="100" step="500" /></label>
          <label v-if="activeProtocol === 'websocket'">Default timeout<input v-model.number="websocketRequest.timeoutMs" type="number" min="1000" step="1000" /></label>
          <label v-if="activeProtocol === 'grpc'">Default timeout<input v-model.number="grpcRequest.timeoutMs" type="number" min="1000" step="1000" /></label>
          <label>Editor font size<input v-model.number="uiFontSize" type="number" min="11" max="18" /></label>
          <label class="check"><input v-model="activeOptions.verifySsl" type="checkbox" /> Verify TLS certificates</label>
        </div>
        <section class="proxy-settings">
          <header>
            <h3>Proxy</h3>
            <button @click="ensureProxySettings">Configure</button>
          </header>
          <div v-if="activeOptions.proxy" class="settings-grid">
            <label>Type<select v-model="activeOptions.proxy.type"><option value="http">HTTP</option><option value="socks5">SOCKS5</option></select></label>
            <label>URL<input v-model="activeOptions.proxy.url" placeholder="http://127.0.0.1:8080" /></label>
            <label>Username<input v-model="activeOptions.proxy.username" /></label>
            <label>Password<input v-model="activeOptions.proxy.password" type="password" /></label>
          </div>
        </section>
        <dl class="settings-stats">
          <div><dt>Collections</dt><dd>{{ collections.length }}</dd></div>
          <div><dt>Requests</dt><dd>{{ requests.length }}</dd></div>
          <div><dt>History</dt><dd>{{ history.length }}</dd></div>
        </dl>
        <section class="mock-manager">
          <header>
            <h3>Mock Server</h3>
            <div>
              <button @click="addMockRoute">Add route</button>
              <button @click="saveMockRoutes">Sync</button>
              <button @click="refreshMockLogs">Logs</button>
            </div>
          </header>
          <small>{{ mockStatus }}</small>
          <article v-for="(route, index) in mockRoutes" :key="route.id" class="mock-route">
            <label class="check"><input v-model="route.enabled" type="checkbox" /> on</label>
            <select v-model="route.method">
              <option v-for="method in methods" :key="method" :value="method">{{ method }}</option>
            </select>
            <input v-model="route.pathPattern" placeholder="/users/:id" />
            <input v-model.number="route.status" type="number" min="100" max="599" />
            <input v-model.number="route.latencyMs" type="number" min="0" placeholder="latency ms" />
            <button @click="removeAt(mockRoutes, index)">Remove</button>
            <textarea v-model="route.body" spellcheck="false" />
          </article>
          <div class="mock-logs">
            <header>
              <strong>Requests</strong>
              <button @click="clearMockServerLogs">Clear</button>
            </header>
            <article v-for="entry in mockLogs.slice(0, 20)" :key="entry.id">
              <span :data-method="entry.method">{{ entry.method }}</span>
              <strong>{{ entry.path }}</strong>
              <small>{{ entry.status }} {{ new Date(entry.createdAt).toLocaleTimeString() }}</small>
            </article>
          </div>
        </section>
        <section class="flow-manager">
          <header>
            <h3>Flows</h3>
            <div>
              <button @click="newFlow">New</button>
              <button @click="saveFlowDraft">Save</button>
              <button :disabled="flowRunning || flowDraft.steps.length === 0" @click="runFlowDraft">{{ flowRunning ? "Running" : "Run" }}</button>
              <button :disabled="flows.length === 0" @click="deleteFlowDraft">Delete</button>
            </div>
          </header>
          <div class="flow-layout">
            <aside class="flow-list">
              <button v-for="flow in flows" :key="flow.id" :class="{ active: flow.id === flowDraft.id }" @click="loadFlow(flow)">
                <strong>{{ flow.name }}</strong>
                <small>{{ flow.steps.length }} steps</small>
              </button>
              <p v-if="flows.length === 0" class="muted">No saved flows</p>
            </aside>
            <div class="flow-builder">
              <label>Name<input v-model="flowDraft.name" /></label>
              <div class="flow-actions">
                <button @click="addFlowRequestStep()">Add current request</button>
                <button @click="addFlowDelayStep">Add delay</button>
              </div>
              <article v-for="(step, index) in flowDraft.steps" :key="step.id" class="flow-step">
                <header>
                  <strong>{{ index + 1 }}. {{ step.type }}</strong>
                  <div>
                    <button :disabled="index === 0" @click="moveFlowStep(index, -1)">Up</button>
                    <button :disabled="index === flowDraft.steps.length - 1" @click="moveFlowStep(index, 1)">Down</button>
                    <button @click="removeAt(flowDraft.steps, index)">Remove</button>
                  </div>
                </header>
                <label>Name<input v-model="step.name" /></label>
                <template v-if="step.type === 'request'">
                  <div class="flow-request-line">
                    <select v-model="step.request.method">
                      <option v-for="method in methods" :key="method" :value="method">{{ method }}</option>
                    </select>
                    <input v-model="step.request.url" placeholder="https://api.example.com" />
                  </div>
                  <label class="check"><input v-model="step.continueOnFailure" type="checkbox" /> Continue on failure</label>
                </template>
                <template v-if="step.type === 'delay'">
                  <label>Delay ms<input v-model.number="step.delayMs" type="number" min="0" step="100" /></label>
                </template>
              </article>
            </div>
            <aside class="flow-palette">
              <strong>Add saved request</strong>
              <button v-for="saved in requests.filter((item) => item.protocol === 'rest' || item.protocol === 'graphql').slice(0, 12)" :key="saved.id" @click="addFlowRequestStep(saved)">
                <span>{{ savedMethod(saved) }}</span>
                <small>{{ saved.name }}</small>
              </button>
            </aside>
          </div>
          <div v-if="flowResult" class="flow-result">
            <strong :class="flowResult.status === 'passed' ? 'ok' : 'bad'">{{ flowResult.status }}</strong>
            <span>{{ flowResult.steps.length }} completed steps</span>
            <span>{{ Object.keys(flowResult.variables).length }} variables</span>
          </div>
          <div class="flow-log">
            <article v-for="entry in flowLog" :key="entry">{{ entry }}</article>
          </div>
        </section>
      </section>
    </div>

    <div v-if="showDiffModal && diffResult" class="overlay" data-testid="diff-modal" @click.self="showDiffModal = false">
      <section class="modal diff-modal">
        <header>
          <h2>Response diff</h2>
          <button @click="showDiffModal = false">Close</button>
        </header>
        <div class="diff-summary">
          <span>{{ diffResult.summary.additions }} additions</span>
          <span>{{ diffResult.summary.deletions }} deletions</span>
          <span>{{ diffResult.summary.changes }} changes</span>
          <span>{{ Math.round(diffResult.responseTimeDeltaMs) }} ms delta</span>
        </div>
        <div class="diff-panes">
          <pre>{{ diffResult.leftText }}</pre>
          <pre>{{ diffResult.rightText }}</pre>
        </div>
        <div class="diff-list">
          <article v-for="change in diffResult.changes.slice(0, 200)" :key="`${change.type}-${change.path}`" :class="`diff-${change.type}`">
            <strong>{{ change.type }}</strong>
            <span>{{ change.path }}</span>
            <code>{{ JSON.stringify(change.type === 'remove' ? change.oldValue : change.value) }}</code>
          </article>
        </div>
      </section>
    </div>

    <div
      v-if="contextMenu.open && contextMenu.target"
      class="context-menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
    >
      <template v-if="contextMenu.target.type === 'collection'">
        <button data-testid="context-new-folder" @click="createFolderIn(contextMenu.target.collection.id)">New folder</button>
        <button data-testid="context-new-request" @click="newRequestIn(contextMenu.target.collection.id)">New request</button>
        <button data-testid="context-edit-vars" @click="editCollectionVariables(contextMenu.target.collection)">Variables</button>
        <button @click="renameCollection(contextMenu.target.collection)">Rename</button>
        <button @click="duplicateCollection(contextMenu.target.collection)">Duplicate</button>
        <button @click="exportCollection(contextMenu.target.collection)">Export</button>
        <button @click="deleteCollection(contextMenu.target.collection)">Delete</button>
      </template>
      <template v-if="contextMenu.target.type === 'folder'">
        <button data-testid="context-new-folder" @click="createFolderIn(contextMenu.target.folder.collectionId, contextMenu.target.folder.id)">New folder</button>
        <button data-testid="context-new-request" @click="newRequestIn(contextMenu.target.folder.collectionId, contextMenu.target.folder.id)">New request</button>
        <button data-testid="context-edit-vars" @click="editFolderVariables(contextMenu.target.folder)">Variables</button>
        <button @click="renameFolder(contextMenu.target.folder)">Rename</button>
        <button @click="duplicateFolder(contextMenu.target.folder)">Duplicate</button>
        <button :disabled="!contextMenu.target.folder.parentFolderId" @click="moveFolderToParent(contextMenu.target.folder)">Move up one folder</button>
        <button @click="deleteFolder(contextMenu.target.folder)">Delete</button>
      </template>
      <template v-if="contextMenu.target.type === 'request'">
        <button @click="loadRequest(contextMenu.target.request); closeContextMenu()">Open</button>
        <button @click="duplicateRequest(contextMenu.target.request)">Duplicate</button>
        <button :disabled="!contextMenu.target.request.folderId" @click="moveRequestToParent(contextMenu.target.request)">Move up one folder</button>
        <button @click="deleteRequest(contextMenu.target.request)">Delete</button>
      </template>
    </div>

    <dialog :open="saveDialog.open" class="modal">
      <h2>Save request</h2>
      <label>Name<input v-model="saveDialog.name" data-testid="save-name" /></label>
      <label>Collection<select v-model="saveDialog.collectionId"><option v-for="collection in collections" :key="collection.id" :value="collection.id">{{ collection.name }}</option></select></label>
      <label>
        Folder
        <select v-model="saveDialog.folderId">
          <option value="">Collection root</option>
          <option v-for="folder in folderOptions" :key="folder.id" :value="folder.id">{{ folderChain(folder.id).map((item) => item.name).join(" / ") }}</option>
        </select>
      </label>
      <footer><button @click="saveDialog.open = false">Cancel</button><button data-testid="confirm-save" @click="saveRequest">Save</button></footer>
    </dialog>

    <aside v-if="variableEditor.open" class="drawer">
      <h2>Variables</h2>
      <p class="drawer-subtitle">{{ variableEditor.name }}</p>
      <KeyValueEditor
        :items="variableEditor.variables"
        test-prefix="scope-var"
        @add="addKeyValue(variableEditor.variables)"
        @remove="removeAt(variableEditor.variables, $event)"
      />
      <footer>
        <button @click="variableEditor.open = false">Cancel</button>
        <button data-testid="scope-save-vars" @click="saveScopeVariables">Save</button>
      </footer>
    </aside>

    <aside v-if="showEnvPanel" class="drawer">
      <h2>Environment</h2>
      <label>Name<input v-model="envDraft!.name" data-testid="env-name" /></label>
      <div v-for="(variable, index) in envDraft!.variables" :key="index" class="kv-row">
        <input v-model="variable.key" data-testid="env-var-key" placeholder="base_url" />
        <input v-model="variable.value" data-testid="env-var-value" placeholder="https://api.example.com" />
        <label class="check"><input v-model="variable.enabled" type="checkbox" /> on</label>
        <button @click="removeAt(envDraft!.variables, index)">Remove</button>
      </div>
      <button data-testid="add-env-var" @click="addKeyValue(envDraft!.variables)">Add variable</button>
      <footer>
        <button v-if="envDraft?.id" @click="deleteEnvironmentDraft">Delete</button>
        <button @click="showEnvPanel = false">Cancel</button>
        <button data-testid="save-env" @click="saveEnvironment">Save</button>
      </footer>
    </aside>
  </div>
</template>
