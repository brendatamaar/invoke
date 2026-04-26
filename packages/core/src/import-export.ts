import yaml from "js-yaml";
import JSZip from "jszip";
import { slug } from "./format";
import { emptyRequest, id, toRequestConfig } from "./request";
import type { AuthConfig, BodyMode, Collection, HttpMethod, KeyValue, RequestConfig, SavedRequest } from "./types";

const INVOKE_YAML_VERSION = "1.0";

type FlatRequestDocument = {
  invoke_version: string;
  type: "request";
  name: string;
  protocol: "rest";
  method: HttpMethod;
  url: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  auth?: AuthConfig;
  body?: {
    type: "none" | "json" | "text" | "form-data" | "form-urlencoded";
    content?: string;
  };
  variables?: Record<string, string>;
  timeoutMs?: number;
};

type YamlBodyType = NonNullable<FlatRequestDocument["body"]>["type"];

export function parseCurl(command: string): Partial<RequestConfig> {
  const tokens = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(stripQuotes) ?? [];
  const request = emptyRequest();
  if (tokens[0] !== "curl") return {};
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "-X" || token === "--request") {
      request.method = tokens[++i]?.toUpperCase() as HttpMethod;
    } else if (token === "-H" || token === "--header") {
      const [key, ...rest] = (tokens[++i] ?? "").split(":");
      request.headers.push({ key: key.trim(), value: rest.join(":").trim(), enabled: true });
    } else if (["-d", "--data", "--data-raw", "--data-binary"].includes(token)) {
      request.method = request.method === "GET" ? "POST" : request.method;
      request.bodyMode = "raw";
      request.body = tokens[++i] ?? "";
    } else if (!token.startsWith("-")) {
      request.url = token;
    }
  }
  const authHeader = request.headers.find((header) => header.key.toLowerCase() === "authorization");
  if (authHeader?.value.toLowerCase().startsWith("bearer ")) {
    request.auth = { type: "bearer", token: authHeader.value.slice(7) };
  }
  return request;
}

export async function exportCollectionZip(collection: Collection, requests: SavedRequest[]) {
  const zip = new JSZip();
  const root = zip.folder(slug(collection.name))!;
  root.file(
    "collection.invoke.yaml",
    yaml.dump({
      invoke_version: INVOKE_YAML_VERSION,
      type: "collection",
      name: collection.name,
      description: collection.description ?? "",
      variables: keyValuesToRecord(collection.variables ?? [])
    })
  );
  for (const request of requests) {
    root.file(`${slug(request.name)}.invoke.yaml`, yaml.dump(flatRequestDocument(request)));
  }
  return zip.generateAsync({ type: "blob" });
}

export async function importInvokeZip(file: Blob) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documents = await Promise.all(
    Object.values(zip.files)
      .filter((entry) => !entry.dir && (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")))
      .map(async (entry) => parseYamlDocument(await entry.async("string")))
  );
  return importedFromDocuments(documents);
}

export async function importYamlFiles(files: File[]) {
  const zipFile = files.find((file) => file.name.endsWith(".zip"));
  if (zipFile) return importInvokeZip(zipFile);

  const parsed = await Promise.all(
    files
      .filter((file) => file.name.endsWith(".yaml") || file.name.endsWith(".yml"))
      .map(async (file) => parseYamlDocument(await file.text()))
  );
  return importedFromDocuments(parsed);
}

export function importPostmanCollection(doc: any) {
  const collection: Collection = {
    id: id(),
    name: doc?.info?.name ?? "Postman import",
    variables: [],
    sortOrder: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  const requests: SavedRequest[] = [];
  const visit = (items: any[]) => {
    for (const item of items ?? []) {
      if (item.item) visit(item.item);
      if (!item.request) continue;
      const raw = item.request;
      const url = typeof raw.url === "string" ? raw.url : raw.url?.raw ?? "";
      const body = raw.body?.raw ?? "";
      const now = Date.now();
      const request = toRequestConfig({
        ...emptyRequest(),
        method: (raw.method ?? "GET").toUpperCase() as HttpMethod,
        url,
        headers: (raw.header ?? []).map((h: any) => ({ key: h.key, value: h.value, enabled: !h.disabled })),
        auth: postmanAuth(raw.auth),
        bodyMode: body ? "raw" : "none",
        body
      });
      requests.push({
        id: id(),
        collectionId: collection.id,
        folderId: null,
        name: item.name ?? raw.method + " " + url,
        protocol: "rest",
        request,
        sortOrder: now,
        createdAt: now,
        updatedAt: now
      });
    }
  };
  visit(doc?.item ?? []);
  return { collection, requests };
}

function flatRequestDocument(saved: SavedRequest): FlatRequestDocument {
  const request = saved.request as RequestConfig;
  return {
    invoke_version: INVOKE_YAML_VERSION,
    type: "request",
    name: saved.name,
    protocol: "rest",
    method: request.method,
    url: request.url,
    params: keyValuesToRecord(request.params),
    headers: keyValuesToRecord(request.headers),
    auth: request.auth,
    body: {
      type: bodyModeToYaml(request.bodyMode),
      content: request.body || undefined
    },
    variables: keyValuesToRecord(request.variables ?? []),
    timeoutMs: request.timeoutMs
  };
}

function importedFromDocuments(documents: any[]) {
  const now = Date.now();
  const collectionDoc = documents.find((doc) => doc?.type === "collection");
  const collection: Collection = {
    id: id(),
    name: collectionDoc?.name ?? collectionDoc?.collection?.name ?? "Imported collection",
    description: collectionDoc?.description ?? collectionDoc?.collection?.description,
    variables: recordToKeyValues(collectionDoc?.variables ?? collectionDoc?.collection?.variables ?? {}),
    sortOrder: now,
    createdAt: now,
    updatedAt: now
  };
  const requests = documents
    .filter((doc) => doc?.type === "request")
    .map((doc, index) => savedRequestFromDocument(doc, collection.id, now + index));
  return { collection, requests };
}

function savedRequestFromDocument(doc: any, collectionId: string, sortOrder: number): SavedRequest {
  if (doc.request) return savedRequestFromWrappedDocument(doc, collectionId, sortOrder);

  const now = Date.now();
  const request = toRequestConfig({
    ...emptyRequest(),
    method: (doc.method ?? "GET").toUpperCase() as HttpMethod,
    url: doc.url ?? "",
    params: recordToKeyValues(doc.params ?? {}),
    headers: recordToKeyValues(doc.headers ?? {}),
    bodyMode: yamlBodyToMode(doc.body?.type),
    body: doc.body?.content ?? "",
    auth: doc.auth ?? { type: "none" },
    timeoutMs: doc.timeoutMs ?? 30000,
    variables: recordToKeyValues(doc.variables ?? {})
  });
  return {
    id: id(),
    collectionId,
    folderId: null,
    name: doc.name ?? `${request.method} ${request.url}`,
    protocol: doc.protocol ?? "rest",
    request,
    sortOrder,
    createdAt: now,
    updatedAt: now
  };
}

function savedRequestFromWrappedDocument(doc: any, collectionId: string, sortOrder: number): SavedRequest {
  const now = Date.now();
  const wrapped = doc.request;
  if (wrapped.request) {
    return {
      ...wrapped,
      id: id(),
      collectionId,
      folderId: wrapped.folderId ?? null,
      protocol: wrapped.protocol ?? "rest",
      sortOrder,
      createdAt: now,
      updatedAt: now
    };
  }

  return {
    id: id(),
    collectionId,
    folderId: null,
    name: wrapped.name ?? "Imported request",
    protocol: "rest",
    request: toRequestConfig(wrapped),
    sortOrder,
    createdAt: now,
    updatedAt: now
  };
}

function postmanAuth(auth: any): RequestConfig["auth"] {
  if (!auth?.type) return { type: "none" };
  const values = Object.fromEntries((auth[auth.type] ?? []).map((item: any) => [item.key, item.value]));
  if (auth.type === "bearer") return { type: "bearer", token: values.token ?? "" };
  if (auth.type === "basic") return { type: "basic", username: values.username ?? "", password: values.password ?? "" };
  if (auth.type === "apikey") {
    return {
      type: "api-key",
      apiKeyName: values.key ?? "",
      apiKeyValue: values.value ?? "",
      apiKeyIn: values.in === "query" ? "query" : "header"
    };
  }
  return { type: "none" };
}

function parseYamlDocument(content: string) {
  return yaml.load(content, { schema: yaml.JSON_SCHEMA }) as any;
}

function keyValuesToRecord(items: KeyValue[] = []) {
  return Object.fromEntries(
    items.filter((item) => item.enabled !== false && item.key.trim()).map((item) => [item.key.trim(), item.value])
  );
}

function recordToKeyValues(value: Record<string, string> | KeyValue[] = {}) {
  if (Array.isArray(value)) return value;
  return Object.entries(value).map(([key, raw]) => ({ key, value: String(raw), enabled: true }));
}

function bodyModeToYaml(mode: BodyMode): YamlBodyType {
  if (mode === "raw") return "text";
  if (mode === "urlencoded") return "form-urlencoded";
  return mode;
}

function yamlBodyToMode(mode: string | undefined): BodyMode {
  if (mode === "text") return "raw";
  if (mode === "form-urlencoded") return "urlencoded";
  if (mode === "form-data" || mode === "json" || mode === "none") return mode;
  return "none";
}

function stripQuotes(value: string) {
  return value.replace(/^["']|["']$/g, "");
}
