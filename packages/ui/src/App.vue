<script setup lang="ts">
import {
  emptyRequest,
  exportCollectionZip,
  extractVariables,
  importPostmanCollection,
  importYamlFiles,
  InvokeStore,
  parseCurl,
  prettyBody,
  resolveRequest,
  type AuthConfig,
  type BodyMode,
  type Collection,
  type Environment,
  type ExecuteResponse,
  type ExtractionRule,
  type HistoryEntry,
  type HttpMethod,
  type KeyValue,
  type RequestConfig,
  type SavedRequest
} from "@invoke/core";
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { execute, ping } from "./lib/api";
import KeyValueEditor from "./components/KeyValueEditor.vue";

const store = new InvokeStore();

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const bodyModes: BodyMode[] = ["none", "json", "form-data", "urlencoded", "raw"];
const authTypes: AuthConfig["type"][] = ["none", "basic", "bearer", "api-key"];

const request = ref<RequestConfig>(emptyRequest());
const collections = ref<Collection[]>([]);
const requests = ref<SavedRequest[]>([]);
const environments = ref<Environment[]>([]);
const activeEnvironmentId = ref<string | undefined>();
const history = ref<HistoryEntry[]>([]);
const response = ref<ExecuteResponse | undefined>();
const selectedTab = ref<"params" | "headers" | "auth" | "body" | "extract">("params");
const responseTab = ref<"body" | "headers" | "timing" | "tls">("body");
const loading = ref(false);
const status = ref("Ready");
const theme = ref(localStorage.getItem("theme") ?? "dark");
const showEnvPanel = ref(false);
const envDraft = ref<Environment | undefined>();
const saveDialog = reactive({ open: false, name: "", collectionId: "" });
const extractRules = ref<ExtractionRule[]>([]);
const sessionVariables = ref<Record<string, string>>({});

const activeEnvironment = computed(() => environments.value.find((env) => env.id === activeEnvironmentId.value));
const groupedRequests = computed(() =>
  collections.value.map((collection) => ({
    collection,
    requests: requests.value.filter((item) => item.collectionId === collection.id)
  }))
);
const resolution = computed(() => resolveRequest(request.value, activeEnvironment.value, sessionVariables.value));
const statusClass = computed(() => {
  const code = response.value?.status ?? 0;
  if (code >= 200 && code < 300) return "ok";
  if (code >= 400) return "bad";
  return "warn";
});
const responseContentType = computed(() => response.value?.headers.find((h) => h.key.toLowerCase() === "content-type")?.value ?? "");
const responseBody = computed(() => prettyBody(response.value?.body ?? "", responseContentType.value));

watch(theme, (value) => {
  document.documentElement.dataset.theme = value;
  localStorage.setItem("theme", value);
});

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
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleShortcut);
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
  requests.value = await store.listRequests();
  environments.value = await store.listEnvironments();
  activeEnvironmentId.value = await store.getActiveEnvironmentId();
  history.value = await store.listHistory();
  if (collections.value.length === 0) {
    const collection = await store.createCollection("Scratch");
    collections.value = [collection];
  }
}

function handleShortcut(event: KeyboardEvent) {
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

async function send() {
  loading.value = true;
  response.value = undefined;
  const resolved = resolveRequest(request.value, activeEnvironment.value, sessionVariables.value);
  try {
    if (resolved.unresolved.length > 0) {
      status.value = `Unresolved: ${resolved.unresolved.join(", ")}`;
    }
    const result = await execute(resolved.request);
    response.value = result;
    const extracted = extractVariables(result, extractRules.value);
    sessionVariables.value = { ...sessionVariables.value, ...extracted };
    await store.addHistory({ request: request.value, response: result, environmentId: activeEnvironmentId.value });
    history.value = await store.listHistory();
    status.value = result.error ? result.error : `Completed in ${Math.round(result.timing?.totalMs ?? 0)} ms`;
  } catch (error) {
    status.value = String(error);
  } finally {
    loading.value = false;
  }
}

function newRequest() {
  request.value = emptyRequest();
  response.value = undefined;
  extractRules.value = [];
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
  saveDialog.open = true;
}

async function saveRequest() {
  if (!saveDialog.name || !saveDialog.collectionId) return;
  const saved = await store.saveRequest(request.value, saveDialog.name, saveDialog.collectionId);
  request.value = { ...saved };
  saveDialog.open = false;
  await refreshAll();
}

function loadRequest(saved: SavedRequest) {
  request.value = JSON.parse(JSON.stringify(saved));
  response.value = undefined;
}

async function deleteRequest(saved: SavedRequest) {
  if (!confirm(`Delete ${saved.name}?`)) return;
  await store.deleteRequest(saved.id);
  await refreshAll();
}

async function deleteCollection(collection: Collection) {
  if (!confirm(`Delete ${collection.name} and all requests inside it?`)) return;
  await store.deleteCollection(collection.id);
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

function maybeParseCurl() {
  if (!request.value.url.trim().startsWith("curl ")) return;
  request.value = { ...request.value, ...parseCurl(request.value.url) };
}

async function exportCollection(collection: Collection) {
  const blob = await exportCollectionZip(
    collection,
    requests.value.filter((item) => item.collectionId === collection.id)
  );
  download(blob, `${collection.name}.invoke.zip`);
}

async function importFiles(event: Event, kind: "yaml" | "postman") {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  if (files.length === 0) return;
  if (kind === "postman") {
    const doc = JSON.parse(await files[0].text());
    const imported = importPostmanCollection(doc);
    await store.createCollection(imported.collection.name);
    const latest = (await store.listCollections())[0];
    for (const item of imported.requests) {
      await store.saveRequest({ ...item, id: undefined, collectionId: latest.id }, item.name, latest.id);
    }
  } else {
    const imported = await importYamlFiles(files);
    const collection = await store.createCollection(imported.collection.name);
    for (const item of imported.requests) {
      await store.saveRequest({ ...item, id: undefined, collectionId: collection.id }, item.name, collection.id);
    }
  }
  input.value = "";
  await refreshAll();
}

function loadHistory(entry: HistoryEntry) {
  request.value = JSON.parse(JSON.stringify(entry.request));
  response.value = entry.response;
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
          <span>alpha</span>
        </div>
        <button data-testid="new-request" title="New request" @click="newRequest">+</button>
      </div>

      <section class="side-section">
        <div class="side-title">
          <span>Collections</span>
          <button @click="createCollection">New</button>
        </div>
        <div v-for="group in groupedRequests" :key="group.collection.id" class="collection">
          <div class="collection-row">
            <button class="linkish" @click="request.collectionId = group.collection.id">{{ group.collection.name }}</button>
            <div>
              <button title="Export" @click="exportCollection(group.collection)">Export</button>
              <button title="Delete" @click="deleteCollection(group.collection)">Del</button>
            </div>
          </div>
          <button
            v-for="saved in group.requests"
            :key="saved.id"
            class="request-row"
            :class="{ active: request.id === saved.id }"
            @click="loadRequest(saved)"
          >
            <span :data-method="saved.method">{{ saved.method }}</span>
            <strong>{{ saved.name }}</strong>
            <small @click.stop="deleteRequest(saved)">x</small>
          </button>
        </div>
      </section>

      <section class="side-section">
        <div class="side-title"><span>Import</span></div>
        <label class="file-button">
          Postman
          <input type="file" accept=".json" @change="importFiles($event, 'postman')" />
        </label>
        <label class="file-button">
          YAML files
          <input type="file" multiple accept=".yaml,.yml" @change="importFiles($event, 'yaml')" />
        </label>
      </section>

      <section class="side-section history">
        <div class="side-title"><span>History</span></div>
        <button v-for="entry in history" :key="entry.id" class="history-row" @click="loadHistory(entry)">
          <span :data-method="entry.request.method">{{ entry.request.method }}</span>
          <strong>{{ entry.request.url || "Untitled" }}</strong>
          <small>{{ entry.response?.status ?? "-" }}</small>
        </button>
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
        <button @click="theme = theme === 'dark' ? 'light' : 'dark'">{{ theme === "dark" ? "Light" : "Dark" }}</button>
        <span class="status">{{ status }}</span>
      </header>

      <section class="request-line">
        <select v-model="request.method" data-testid="method-select">
          <option v-for="method in methods" :key="method" :value="method">{{ method }}</option>
        </select>
        <input v-model="request.url" data-testid="url-input" placeholder="https://api.example.com/users or paste cURL" @blur="maybeParseCurl" />
        <button class="send" data-testid="send-request" :disabled="loading" @click="send">{{ loading ? "Sending" : "Send" }}</button>
        <button data-testid="save-request" @click="openSave">Save</button>
      </section>

      <section v-if="resolution.unresolved.length" class="warning">
        Unresolved variables: {{ resolution.unresolved.join(", ") }}
      </section>

      <section class="panes">
        <div class="panel">
          <nav class="tabs">
            <button :class="{ active: selectedTab === 'params' }" @click="selectedTab = 'params'">Params</button>
            <button :class="{ active: selectedTab === 'headers' }" @click="selectedTab = 'headers'">Headers</button>
            <button :class="{ active: selectedTab === 'auth' }" @click="selectedTab = 'auth'">Auth</button>
            <button :class="{ active: selectedTab === 'body' }" @click="selectedTab = 'body'">Body</button>
            <button :class="{ active: selectedTab === 'extract' }" @click="selectedTab = 'extract'">Extract</button>
          </nav>

          <div v-if="selectedTab === 'params'" class="editor">
            <KeyValueEditor :items="request.params" @add="addKeyValue(request.params)" @remove="removeAt(request.params, $event)" />
          </div>
          <div v-if="selectedTab === 'headers'" class="editor">
            <KeyValueEditor :items="request.headers" @add="addKeyValue(request.headers)" @remove="removeAt(request.headers, $event)" />
          </div>
          <div v-if="selectedTab === 'auth'" class="editor form-grid">
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
          </div>
          <div v-if="selectedTab === 'body'" class="editor">
            <select v-model="request.bodyMode">
              <option v-for="mode in bodyModes" :key="mode" :value="mode">{{ mode }}</option>
            </select>
            <textarea v-model="request.body" spellcheck="false" placeholder="{ }" />
          </div>
          <div v-if="selectedTab === 'extract'" class="editor">
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
          </nav>
          <pre v-if="responseTab === 'body'" class="body-view" data-testid="response-body">{{ response?.error || responseBody }}</pre>
          <table v-if="responseTab === 'headers'">
            <tbody><tr v-for="header in response?.headers ?? []" :key="header.key"><th>{{ header.key }}</th><td>{{ header.value }}</td></tr></tbody>
          </table>
          <div v-if="responseTab === 'timing'" class="timing-grid">
            <div v-for="(value, key) in response?.timing ?? {}" :key="key"><span>{{ key }}</span><strong>{{ Math.round(Number(value) * 100) / 100 }} ms</strong></div>
          </div>
          <div v-if="responseTab === 'tls'" class="tls-view">
            <p>{{ response?.tls?.version }} {{ response?.tls?.cipherSuite }}</p>
            <article v-for="cert in response?.tls?.certificates ?? []" :key="cert.sha256Fingerprint">
              <strong>{{ cert.subject }}</strong>
              <span>Issuer: {{ cert.issuer }}</span>
              <span>Valid: {{ cert.notBefore }} to {{ cert.notAfter }}</span>
              <code>{{ cert.sha256Fingerprint }}</code>
            </article>
          </div>
        </div>
      </section>
    </main>

    <dialog :open="saveDialog.open" class="modal">
      <h2>Save request</h2>
      <label>Name<input v-model="saveDialog.name" data-testid="save-name" /></label>
      <label>Collection<select v-model="saveDialog.collectionId"><option v-for="collection in collections" :key="collection.id" :value="collection.id">{{ collection.name }}</option></select></label>
      <footer><button @click="saveDialog.open = false">Cancel</button><button data-testid="confirm-save" @click="saveRequest">Save</button></footer>
    </dialog>

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
