<script setup lang="ts">
import {
  CODE_EXPORT_TARGETS,
  emptyGraphQLRequest,
  emptyRequest,
  exportCollectionZip,
  extractVariables,
  generateCodeSnippet,
  graphQLToRequestConfig,
  importOpenApiSpec,
  importPostmanCollection,
  importYamlFiles,
  InvokeStore,
  parseCurl,
  prettyBody,
  resolveGraphQLRequest,
  resolveRequest,
  searchHistory,
  type AuthConfig,
  type BodyMode,
  type CodeExportTarget,
  type Collection,
  type Environment,
  type ExecuteResponse,
  type ExtractionRule,
  type Folder,
  type GraphQLRequestConfig,
  type HistoryEntry,
  type HttpMethod,
  type KeyValue,
  type ProtocolRequestConfig,
  type RequestConfig,
  type RequestDraft,
  type RequestProtocol,
  type SavedRequest
} from "@invoke/core";
import Fuse from "fuse.js";
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { execute, ping } from "./lib/api";
import FolderTreeNode from "./components/FolderTreeNode.vue";
import KeyValueEditor from "./components/KeyValueEditor.vue";
import TimingWaterfall from "./components/TimingWaterfall.vue";

interface FolderTreeNodeView {
  folder: Folder;
  folders: FolderTreeNodeView[];
  requests: SavedRequest[];
  depth: number;
}

type ContextTarget =
  | { type: "collection"; collection: Collection }
  | { type: "folder"; folder: Folder }
  | { type: "request"; request: SavedRequest };

type PaletteKind = "command" | "collection" | "folder" | "request" | "environment" | "history";

interface PaletteItem {
  id: string;
  kind: PaletteKind;
  title: string;
  subtitle: string;
  keywords: string;
  method?: string;
  run: () => void | Promise<void>;
}

const store = new InvokeStore();
const CodeViewer = defineAsyncComponent(() => import("./components/CodeViewer.vue"));

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const bodyModes: BodyMode[] = ["none", "json", "form-data", "urlencoded", "raw"];
const authTypes: AuthConfig["type"][] = ["none", "basic", "bearer", "api-key"];
const protocols: RequestProtocol[] = ["rest", "graphql"];

const request = ref<RequestDraft>(emptyRequest());
const graphqlRequest = ref<GraphQLRequestConfig>(emptyGraphQLRequest());
const collections = ref<Collection[]>([]);
const folders = ref<Folder[]>([]);
const requests = ref<SavedRequest[]>([]);
const environments = ref<Environment[]>([]);
const activeEnvironmentId = ref<string | undefined>();
const history = ref<HistoryEntry[]>([]);
const response = ref<ExecuteResponse | undefined>();
const selectedTab = ref<"params" | "headers" | "auth" | "body" | "graphql" | "graphqlVariables" | "extract">("params");
const responseTab = ref<"body" | "headers" | "timing" | "tls" | "code">("body");
const loading = ref(false);
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
const openApiFileInput = ref<HTMLInputElement>();
const postmanFileInput = ref<HTMLInputElement>();
const invokeFileInput = ref<HTMLInputElement>();
const theme = ref(localStorage.getItem("theme") ?? "dark");
const showEnvPanel = ref(false);
const envDraft = ref<Environment | undefined>();
const saveDialog = reactive({ open: false, name: "", collectionId: "", folderId: "" });
const extractRules = ref<ExtractionRule[]>([]);
const sessionVariables = ref<Record<string, string>>({});
const showExtractTab = false;
const expandedFolderIds = ref<string[]>([]);
const contextMenu = reactive<{ open: boolean; x: number; y: number; target?: ContextTarget }>({
  open: false,
  x: 0,
  y: 0
});
let historySearchTimer: ReturnType<typeof setTimeout> | undefined;
let codeGenerationRun = 0;
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
const resolutionScopes = computed(() => [
  { name: "environment", variables: activeEnvironment.value?.variables ?? [] },
  { name: "collection", variables: activeCollection.value?.variables ?? [] },
  ...activeFolderChain.value.map((folder) => ({ name: `folder:${folder.name}`, variables: folder.variables ?? [] })),
  { name: "request", variables: request.value.variables ?? [] },
  { name: "session", variables: sessionVariables.value }
]);
const restResolution = computed(() => resolveRequest(request.value, resolutionScopes.value));
const graphqlResolution = computed(() => resolveGraphQLRequest(graphqlRequest.value, resolutionScopes.value));
const resolution = computed(() => (activeProtocol.value === "graphql" ? graphqlResolution.value : restResolution.value));
const folderOptions = computed(() => folders.value.filter((folder) => folder.collectionId === saveDialog.collectionId).sort(sortByOrder));
const statusClass = computed(() => {
  const code = response.value?.status ?? 0;
  if (code >= 200 && code < 300) return "ok";
  if (code >= 400) return "bad";
  return "warn";
});
const responseContentType = computed(() => response.value?.headers.find((h) => h.key.toLowerCase() === "content-type")?.value ?? "");
const responseBody = computed(() => prettyBody(response.value?.body ?? "", responseContentType.value));
const displayedHistory = computed(() => searchHistory(history.value, debouncedHistoryQuery.value, 100));
const codeExportRequest = computed(() => {
  if (activeProtocol.value === "graphql") {
    return resolveRequest(graphQLToRequestConfig(graphqlResolution.value.request as GraphQLRequestConfig)).request;
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

onMounted(async () => {
  document.documentElement.dataset.theme = theme.value;
  await refreshAll();
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
  return {
    id: `request:${saved.id}`,
    kind: "request",
    title: saved.name,
    subtitle: [collection?.name, ...chain.map((item) => item.name), saved.request.url].filter(Boolean).join(" / "),
    keywords: `${saved.name} ${saved.request.url} ${savedMethod(saved)} ${collection?.name ?? ""} ${chain.map((item) => item.name).join(" ")}`,
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

async function send() {
  loading.value = true;
  response.value = undefined;
  const resolved =
    activeProtocol.value === "graphql"
      ? resolveGraphQLRequest(graphqlRequest.value, resolutionScopes.value)
      : resolveRequest(request.value, resolutionScopes.value);
  const executable = activeProtocol.value === "graphql" ? graphQLToRequestConfig(resolved.request as GraphQLRequestConfig) : (resolved.request as RequestConfig);
  try {
    if (resolved.unresolved.length > 0) {
      status.value = `Unresolved: ${resolved.unresolved.join(", ")}`;
    }
    const result = await execute(executable);
    response.value = result;
    const extracted = extractVariables(result, extractRules.value);
    sessionVariables.value = { ...sessionVariables.value, ...extracted };
    await store.addHistory({
      request: activeProtocol.value === "graphql" ? graphqlRequest.value : request.value,
      response: result,
      environmentId: activeEnvironmentId.value,
      requestId: request.value.id,
      collectionId: request.value.collectionId,
      protocol: activeProtocol.value
    });
    history.value = await store.listHistory(10000);
    status.value = result.error ? result.error : `Completed in ${Math.round(result.timing?.totalMs ?? 0)} ms`;
  } catch (error) {
    status.value = String(error);
  } finally {
    loading.value = false;
  }
}

function newRequest() {
  request.value = emptyRequest();
  graphqlRequest.value = emptyGraphQLRequest();
  response.value = undefined;
  extractRules.value = [];
}

function newRequestIn(collectionId?: string, folderId: string | null = null) {
  request.value = {
    ...emptyRequest(),
    collectionId: collectionId ?? collections.value[0]?.id,
    folderId
  };
  graphqlRequest.value = emptyGraphQLRequest();
  response.value = undefined;
  extractRules.value = [];
  closeContextMenu();
}

function selectCollection(collectionId: string) {
  request.value = { ...request.value, collectionId, folderId: null };
}

function setProtocol(protocol: RequestProtocol) {
  if (protocol !== "rest" && protocol !== "graphql") return;
  request.value = { ...request.value, protocol };
  if (protocol === "graphql" && selectedTab.value === "params") selectedTab.value = "graphql";
  if (protocol === "rest" && (selectedTab.value === "graphql" || selectedTab.value === "graphqlVariables")) selectedTab.value = "params";
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
  const saved = await store.saveRequest(activeProtocol.value === "graphql" ? graphqlRequest.value : request.value, saveDialog.name, saveDialog.collectionId, {
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
}

function requestDraftFromSaved(saved: SavedRequest): RequestDraft {
  return {
    ...(JSON.parse(JSON.stringify(saved.request)) as RequestConfig),
    id: saved.id,
    collectionId: saved.collectionId,
    folderId: saved.folderId,
    name: saved.name,
    protocol: saved.protocol,
    sortOrder: saved.sortOrder
  };
}

function applySavedRequest(saved: SavedRequest) {
  if (saved.protocol === "graphql") {
    graphqlRequest.value = JSON.parse(JSON.stringify(saved.request)) as GraphQLRequestConfig;
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

  request.value = requestDraftFromSaved(saved);
}

function savedMethod(saved: SavedRequest) {
  if (saved.protocol === "graphql") return "GQL";
  return (saved.request as RequestConfig).method;
}

function historyMethod(entry: HistoryEntry) {
  return entry.protocol === "graphql" ? "GQL" : (entry.request as RequestConfig).method;
}

function historyUrl(entry: HistoryEntry) {
  return entry.request.url || "Untitled";
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

async function setActiveEnvironment(id?: string) {
  activeEnvironmentId.value = id;
  await store.setActiveEnvironmentId(id);
}

function addKeyValue(target: KeyValue[]) {
  target.push({ key: "", value: "", enabled: true });
}

function removeAt(target: unknown[], index: number) {
  target.splice(index, 1);
}

function addExtraction() {
  extractRules.value.push({ name: "", jsonPath: "$." });
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

async function importFiles(event: Event, kind: "yaml" | "postman" | "openapi") {
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
  if (entry.protocol === "graphql") {
    graphqlRequest.value = JSON.parse(JSON.stringify(entry.request)) as GraphQLRequestConfig;
    request.value = {
      ...emptyRequest(),
      id: entry.requestId,
      collectionId: entry.collectionId,
      protocol: "graphql",
      name: "History GraphQL request"
    };
    selectedTab.value = "graphql";
  } else {
    request.value = JSON.parse(JSON.stringify(entry.request));
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
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div>
          <strong>invoke</strong>
          <span>beta 1</span>
        </div>
        <button data-testid="new-request" title="New request" @click="newRequest">+</button>
      </div>

      <section class="side-section">
        <div class="side-title">
          <span>Collections</span>
          <button @click="createCollection">New</button>
        </div>
        <div v-for="group in groupedRequests" :key="group.collection.id" class="collection">
          <div class="collection-row" data-testid="collection-row" @contextmenu.prevent="openCollectionContext($event, group.collection)">
            <button class="linkish" @click="selectCollection(group.collection.id)">{{ group.collection.name }}</button>
            <div>
              <button title="Export" @click="exportCollection(group.collection)">Export</button>
              <button title="Delete" @click="deleteCollection(group.collection)">Del</button>
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
          />
          <button
            v-for="saved in group.requests"
            :key="saved.id"
            class="request-row"
            :class="{ active: request.id === saved.id }"
            @click="loadRequest(saved)"
            @contextmenu.prevent="openRequestContext($event, saved)"
          >
            <span :data-method="savedMethod(saved)">{{ savedMethod(saved) }}</span>
            <strong>{{ saved.name }}</strong>
            <small @click.stop="deleteRequest(saved)">x</small>
          </button>
        </div>
      </section>

      <section class="side-section">
        <div class="side-title"><span>Import</span></div>
        <label class="file-button">
          Postman
          <input ref="postmanFileInput" type="file" accept=".json" @change="importFiles($event, 'postman')" />
        </label>
        <label class="file-button">
          Invoke ZIP
          <input ref="invokeFileInput" type="file" multiple accept=".zip,.yaml,.yml" @change="importFiles($event, 'yaml')" />
        </label>
        <label class="file-button">
          OpenAPI
          <input ref="openApiFileInput" type="file" accept=".json,.yaml,.yml" @change="importFiles($event, 'openapi')" />
        </label>
        <div
          v-if="importPreview.error || importPreview.message"
          class="import-preview"
          :class="{ error: importPreview.error }"
          data-testid="import-preview"
        >
          {{ importPreview.error || importPreview.message }}
        </div>
      </section>

      <section class="side-section history">
        <div class="side-title"><span>History</span></div>
        <input v-model="historyQuery" class="history-search" data-testid="history-search" placeholder="Search history" />
        <button v-for="entry in displayedHistory" :key="entry.id" class="history-row" @click="loadHistory(entry)">
          <span :data-method="historyMethod(entry)">{{ historyMethod(entry) }}</span>
          <strong>{{ historyUrl(entry) }}</strong>
          <small>{{ entry.response?.status ?? "-" }}</small>
        </button>
        <p v-if="displayedHistory.length === 0" class="history-empty">No matching history</p>
      </section>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <select :value="activeEnvironmentId" @change="setActiveEnvironment(($event.target as HTMLSelectElement).value || undefined)">
          <option value="">No environment</option>
          <option v-for="env in environments" :key="env.id" :value="env.id">{{ env.name }}</option>
        </select>
        <button data-testid="edit-env" @click="editEnvironment(activeEnvironment)">Edit env</button>
        <button data-testid="new-env" @click="editEnvironment()">New env</button>
        <button data-testid="open-command-palette" @click="openCommandPalette()">Command</button>
        <button data-testid="open-help" @click="showHelp = true">?</button>
        <button @click="theme = theme === 'dark' ? 'light' : 'dark'">{{ theme === "dark" ? "Light" : "Dark" }}</button>
        <span class="status">{{ status }}</span>
      </header>

      <section class="request-line">
        <select :value="activeProtocol" data-testid="protocol-select" @change="setProtocol(($event.target as HTMLSelectElement).value as RequestProtocol)">
          <option v-for="protocol in protocols" :key="protocol" :value="protocol">{{ protocol.toUpperCase() }}</option>
        </select>
        <select v-if="activeProtocol === 'rest'" v-model="request.method" data-testid="method-select">
          <option v-for="method in methods" :key="method" :value="method">{{ method }}</option>
        </select>
        <input
          v-if="activeProtocol === 'rest'"
          v-model="request.url"
          data-testid="url-input"
          placeholder="https://api.example.com/users or paste cURL"
          @blur="maybeParseCurl"
        />
        <input v-else v-model="graphqlRequest.url" data-testid="graphql-url-input" placeholder="https://api.example.com/graphql" />
        <button class="send" data-testid="send-request" :disabled="loading" @click="send">{{ loading ? "Sending" : "Send" }}</button>
        <button data-testid="save-request" @click="openSave">Save</button>
      </section>

      <section v-if="resolution.unresolved.length" class="warning">
        Unresolved variables: {{ resolution.unresolved.join(", ") }}
      </section>

      <section class="panes">
        <div class="panel">
          <nav class="tabs">
            <button v-if="activeProtocol === 'rest'" :class="{ active: selectedTab === 'params' }" @click="selectedTab = 'params'">Params</button>
            <button :class="{ active: selectedTab === 'headers' }" @click="selectedTab = 'headers'">Headers</button>
            <button :class="{ active: selectedTab === 'auth' }" @click="selectedTab = 'auth'">Auth</button>
            <button v-if="activeProtocol === 'rest'" :class="{ active: selectedTab === 'body' }" @click="selectedTab = 'body'">Body</button>
            <button v-if="activeProtocol === 'graphql'" :class="{ active: selectedTab === 'graphql' }" @click="selectedTab = 'graphql'">Query</button>
            <button
              v-if="activeProtocol === 'graphql'"
              :class="{ active: selectedTab === 'graphqlVariables' }"
              @click="selectedTab = 'graphqlVariables'"
            >
              Variables
            </button>
            <button v-if="showExtractTab" :class="{ active: selectedTab === 'extract' }" @click="selectedTab = 'extract'">Extract</button>
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
              v-else
              :items="graphqlRequest.headers"
              @add="addKeyValue(graphqlRequest.headers)"
              @remove="removeAt(graphqlRequest.headers, $event)"
            />
          </div>
          <div v-if="selectedTab === 'auth'" class="editor form-grid">
            <template v-if="activeProtocol === 'rest'">
              <label>Type<select v-model="request.auth.type" data-testid="auth-type"><option v-for="type in authTypes" :key="type" :value="type">{{ type }}</option></select></label>
              <template v-if="request.auth.type === 'basic'">
                <label>Username<input v-model="request.auth.username" /></label>
                <label>Password<input v-model="request.auth.password" type="password" /></label>
              </template>
              <template v-if="request.auth.type === 'bearer'">
                <label>Token<input v-model="request.auth.token" data-testid="bearer-token" /></label>
              </template>
              <template v-if="request.auth.type === 'api-key'">
                <label>Name<input v-model="request.auth.apiKeyName" /></label>
                <label>Value<input v-model="request.auth.apiKeyValue" /></label>
                <label>Location<select v-model="request.auth.apiKeyIn"><option value="header">header</option><option value="query">query</option></select></label>
              </template>
            </template>
            <template v-else>
              <label>Type<select v-model="graphqlRequest.auth.type" data-testid="auth-type"><option v-for="type in authTypes" :key="type" :value="type">{{ type }}</option></select></label>
              <template v-if="graphqlRequest.auth.type === 'basic'">
                <label>Username<input v-model="graphqlRequest.auth.username" /></label>
                <label>Password<input v-model="graphqlRequest.auth.password" type="password" /></label>
              </template>
              <template v-if="graphqlRequest.auth.type === 'bearer'">
                <label>Token<input v-model="graphqlRequest.auth.token" data-testid="bearer-token" /></label>
              </template>
              <template v-if="graphqlRequest.auth.type === 'api-key'">
                <label>Name<input v-model="graphqlRequest.auth.apiKeyName" /></label>
                <label>Value<input v-model="graphqlRequest.auth.apiKeyValue" /></label>
                <label>Location<select v-model="graphqlRequest.auth.apiKeyIn"><option value="header">header</option><option value="query">query</option></select></label>
              </template>
            </template>
          </div>
          <div v-if="activeProtocol === 'rest' && selectedTab === 'body'" class="editor">
            <select v-model="request.bodyMode" data-testid="body-mode">
              <option v-for="mode in bodyModes" :key="mode" :value="mode">{{ mode }}</option>
            </select>
            <textarea v-model="request.body" spellcheck="false" placeholder="{ }" />
          </div>
          <div v-if="activeProtocol === 'graphql' && selectedTab === 'graphql'" class="editor graphql-editor">
            <label>Operation name<input v-model="graphqlRequest.operationName" data-testid="graphql-operation-input" placeholder="Optional" /></label>
            <textarea v-model="graphqlRequest.query" data-testid="graphql-query-input" spellcheck="false" placeholder="query { }" />
          </div>
          <div v-if="activeProtocol === 'graphql' && selectedTab === 'graphqlVariables'" class="editor graphql-editor">
            <textarea v-model="graphqlRequest.variables" data-testid="graphql-variables-input" spellcheck="false" placeholder="{ }" />
          </div>
          <div v-if="showExtractTab && selectedTab === 'extract'" class="editor">
            <div v-for="(rule, index) in extractRules" :key="index" class="kv-row">
              <input v-model="rule.name" placeholder="variable_name" />
              <input v-model="rule.jsonPath" placeholder="$.token" />
              <button @click="removeAt(extractRules, index)">Remove</button>
            </div>
            <button @click="addExtraction">Add extraction</button>
            <pre class="session-vars">{{ sessionVariables }}</pre>
          </div>
        </div>

        <div class="panel response">
          <div class="response-head">
            <strong :class="statusClass" data-testid="response-status">{{ response?.status ? `${response.status} ${response.statusText}` : "No response" }}</strong>
            <span>{{ response?.timing?.totalMs ? `${Math.round(response.timing.totalMs)} ms` : "" }}</span>
            <span>{{ response?.responseSize ? `${response.responseSize} bytes` : "" }}</span>
          </div>
          <nav class="tabs">
            <button :class="{ active: responseTab === 'body' }" @click="responseTab = 'body'">Body</button>
            <button :class="{ active: responseTab === 'headers' }" @click="responseTab = 'headers'">Headers</button>
            <button :class="{ active: responseTab === 'timing' }" @click="responseTab = 'timing'">Timing</button>
            <button :class="{ active: responseTab === 'tls' }" @click="responseTab = 'tls'">TLS</button>
            <button :class="{ active: responseTab === 'code' }" @click="responseTab = 'code'">Code</button>
          </nav>
          <!-- CodeMirror response rendering is deferred with the editor work above; Alpha keeps a plain pre. -->
          <pre v-if="responseTab === 'body'" class="body-view" data-testid="response-body">{{ response?.error || responseBody }}</pre>
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
        <label>
          Theme
          <select v-model="theme">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <dl class="settings-stats">
          <div><dt>Collections</dt><dd>{{ collections.length }}</dd></div>
          <div><dt>Requests</dt><dd>{{ requests.length }}</dd></div>
          <div><dt>History</dt><dd>{{ history.length }}</dd></div>
        </dl>
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
        <button @click="exportCollection(contextMenu.target.collection)">Export</button>
        <button @click="deleteCollection(contextMenu.target.collection)">Delete</button>
      </template>
      <template v-if="contextMenu.target.type === 'folder'">
        <button data-testid="context-new-folder" @click="createFolderIn(contextMenu.target.folder.collectionId, contextMenu.target.folder.id)">New folder</button>
        <button data-testid="context-new-request" @click="newRequestIn(contextMenu.target.folder.collectionId, contextMenu.target.folder.id)">New request</button>
        <button data-testid="context-edit-vars" @click="editFolderVariables(contextMenu.target.folder)">Variables</button>
        <button @click="renameFolder(contextMenu.target.folder)">Rename</button>
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
      <footer><button @click="showEnvPanel = false">Cancel</button><button data-testid="save-env" @click="saveEnvironment">Save</button></footer>
    </aside>
  </div>
</template>
