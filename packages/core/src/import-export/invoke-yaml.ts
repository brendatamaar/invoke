import yaml from "js-yaml";
import JSZip from "jszip";
import { slug } from "../format";
import {
  emptyGrpcRequest,
  emptyRequest,
  id,
  toRequestConfig,
} from "../request";
import { recordToKeyValues } from "./shared";
import type {
  BodyMode,
  Collection,
  FlatRequestDocument,
  Folder,
  FolderDocument,
  GraphQLRequestConfig,
  GrpcRequestConfig,
  HttpMethod,
  KeyValue,
  RequestConfig,
  SavedRequest,
  YamlBodyType,
} from "../types";

const INVOKE_YAML_VERSION = "1.0";

export async function exportCollectionZip(
  collection: Collection,
  requests: SavedRequest[],
  folders: Folder[] = [],
) {
  const zip = new JSZip();
  const root = zip.folder(slug(collection.name))!;
  const collectionFolders = folders.filter(
    (folder) => folder.collectionId === collection.id,
  );
  const foldersById = new Map(
    collectionFolders.map((folder) => [folder.id, folder]),
  );
  const folderPaths = exportFolderPaths(collectionFolders);
  const requestNamesByPath = new Map<string, Set<string>>();
  root.file(
    "collection.invoke.yaml",
    yaml.dump({
      invoke_version: INVOKE_YAML_VERSION,
      type: "collection",
      name: collection.name,
      description: collection.description ?? "",
      variables: keyValuesToRecord(collection.variables ?? []),
    }),
  );
  for (const folder of sortFoldersForExport(collectionFolders)) {
    root
      .folder(folderPaths.get(folder.id) ?? folderPath(folder, foldersById))!
      .file("folder.invoke.yaml", yaml.dump(folderDocument(folder)));
  }
  for (const request of requests.filter(
    (item) => item.collectionId === collection.id,
  )) {
    const folder = request.folderId
      ? foldersById.get(request.folderId)
      : undefined;
    const path = folder
      ? (folderPaths.get(folder.id) ?? folderPath(folder, foldersById))
      : "";
    const target = path ? root.folder(path)! : root;
    target.file(
      uniqueRequestFileName(request.name, path, requestNamesByPath),
      yaml.dump(flatRequestDocument(request)),
    );
  }
  return zip.generateAsync({ type: "blob" });
}

export async function importInvokeZip(file: Blob) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documents = await Promise.all(
    Object.values(zip.files)
      .filter(
        (entry) =>
          !entry.dir &&
          (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")),
      )
      .map(async (entry) => parseYamlDocument(await entry.async("string"))),
  );
  return importedFromDocuments(documents);
}

export async function importYamlFiles(files: File[]) {
  const zipFile = files.find((file) => file.name.endsWith(".zip"));
  if (zipFile) return importInvokeZip(zipFile);

  const parsed = await Promise.all(
    files
      .filter(
        (file) => file.name.endsWith(".yaml") || file.name.endsWith(".yml"),
      )
      .map(async (file) => parseYamlDocument(await file.text())),
  );
  return importedFromDocuments(parsed);
}

function flatRequestDocument(saved: SavedRequest): FlatRequestDocument {
  if (saved.protocol === "graphql") {
    const request = saved.request as GraphQLRequestConfig;
    return {
      invoke_version: INVOKE_YAML_VERSION,
      type: "request",
      id: saved.id,
      name: saved.name,
      protocol: "graphql",
      folderId: saved.folderId ?? null,
      url: request.url,
      headers: keyValuesToRecord(request.headers),
      auth: request.auth,
      graphql: {
        query: request.query,
        variables: request.variables,
        operationName: request.operationName,
      },
      timeoutMs: request.timeoutMs,
    };
  }

  if (saved.protocol === "grpc") {
    const request = saved.request as GrpcRequestConfig;
    return {
      invoke_version: INVOKE_YAML_VERSION,
      type: "request",
      id: saved.id,
      name: saved.name,
      protocol: "grpc",
      folderId: saved.folderId ?? null,
      url: request.address,
      auth: request.auth,
      grpc: {
        address: request.address,
        service: request.service,
        method: request.method,
        metadata: keyValuesToRecord(request.metadata),
        body: request.body,
        tls: request.tls,
        timeoutMs: request.timeoutMs,
        compression: request.compression,
      },
      timeoutMs: request.timeoutMs,
    };
  }

  const request = saved.request as RequestConfig;
  return {
    invoke_version: INVOKE_YAML_VERSION,
    type: "request",
    id: saved.id,
    name: saved.name,
    protocol: "rest",
    folderId: saved.folderId ?? null,
    method: request.method,
    url: request.url,
    params: keyValuesToRecord(request.params),
    headers: keyValuesToRecord(request.headers),
    auth: request.auth,
    body: {
      type: bodyModeToYaml(request.bodyMode),
      content: request.body || undefined,
    },
    variables: keyValuesToRecord(request.variables ?? []),
    timeoutMs: request.timeoutMs,
  };
}

function importedFromDocuments(documents: any[]) {
  const now = Date.now();
  const collectionDoc = documents.find((doc) => doc?.type === "collection");
  const collection: Collection = {
    id: id(),
    name:
      collectionDoc?.name ??
      collectionDoc?.collection?.name ??
      "Imported collection",
    description:
      collectionDoc?.description ?? collectionDoc?.collection?.description,
    variables: recordToKeyValues(
      collectionDoc?.variables ?? collectionDoc?.collection?.variables ?? {},
    ),
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  };
  const { folders, folderIdMap } = foldersFromDocuments(
    documents.filter((doc) => doc?.type === "folder"),
    collection.id,
    now,
  );
  const requests = documents
    .filter((doc) => doc?.type === "request")
    .map((doc, index) =>
      savedRequestFromDocument(doc, collection.id, now + index, folderIdMap),
    );
  return { collection, folders, requests };
}

function folderDocument(folder: Folder): FolderDocument {
  return {
    invoke_version: INVOKE_YAML_VERSION,
    type: "folder",
    id: folder.id,
    name: folder.name,
    parentFolderId: folder.parentFolderId ?? null,
    description: folder.description,
    variables: keyValuesToRecord(folder.variables ?? []),
    sortOrder: folder.sortOrder,
  };
}

function foldersFromDocuments(
  folderDocs: any[],
  collectionId: string,
  now: number,
) {
  const folderIdMap = new Map<string, string>();
  const originals = folderDocs.map((doc, index) => {
    const sourceId = String(doc.id ?? `folder_${index}`);
    const folder: Folder = {
      id: id(),
      collectionId,
      parentFolderId: doc.parentFolderId ? String(doc.parentFolderId) : null,
      name: doc.name ?? "Imported folder",
      description: doc.description,
      variables: recordToKeyValues(doc.variables ?? {}),
      sortOrder: doc.sortOrder ?? now + index,
      createdAt: now,
      updatedAt: now,
    };
    folderIdMap.set(sourceId, folder.id);
    return {
      folder,
      sourceParentId: doc.parentFolderId ? String(doc.parentFolderId) : null,
    };
  });
  const folders = originals.map(({ folder, sourceParentId }) => ({
    ...folder,
    parentFolderId: sourceParentId
      ? (folderIdMap.get(sourceParentId) ?? null)
      : null,
  }));
  return { folders, folderIdMap };
}

function remapFolderId(folderId: unknown, folderIdMap: Map<string, string>) {
  if (folderId == null || folderId === "") return null;
  const key = String(folderId);
  return folderIdMap.get(key) ?? key;
}

function savedRequestFromDocument(
  doc: any,
  collectionId: string,
  sortOrder: number,
  folderIdMap: Map<string, string> = new Map(),
): SavedRequest {
  if (doc.request)
    return savedRequestFromWrappedDocument(
      doc,
      collectionId,
      sortOrder,
      folderIdMap,
    );

  const now = Date.now();
  const folderId = remapFolderId(doc.folderId, folderIdMap);
  if (doc.protocol === "graphql") {
    const request: GraphQLRequestConfig = {
      url: doc.url ?? "",
      headers: recordToKeyValues(doc.headers ?? {}),
      auth: doc.auth ?? { type: "none" },
      query: doc.graphql?.query ?? "",
      variables: doc.graphql?.variables ?? "{}",
      operationName: doc.graphql?.operationName ?? "",
      timeoutMs: doc.timeoutMs ?? 30000,
    };
    return {
      id: id(),
      collectionId,
      folderId,
      name: doc.name ?? "Imported GraphQL request",
      protocol: "graphql",
      request,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
  }

  if (doc.protocol === "grpc") {
    const grpc = doc.grpc ?? {};
    const request: GrpcRequestConfig = {
      ...emptyGrpcRequest(),
      address: grpc.address ?? doc.url ?? "",
      service: grpc.service ?? "",
      method: grpc.method ?? "",
      metadata: recordToKeyValues(grpc.metadata ?? {}),
      body: grpc.body ?? "{}",
      tls: grpc.tls ?? true,
      timeoutMs: grpc.timeoutMs ?? doc.timeoutMs ?? 30000,
      auth: doc.auth ?? { type: "none" },
      compression: grpc.compression,
    };
    return {
      id: id(),
      collectionId,
      folderId,
      name: doc.name ?? `${request.service}/${request.method}`,
      protocol: "grpc",
      request,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
  }

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
    variables: recordToKeyValues(doc.variables ?? {}),
  });
  return {
    id: id(),
    collectionId,
    folderId,
    name: doc.name ?? `${request.method} ${request.url}`,
    protocol: doc.protocol ?? "rest",
    request,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

function savedRequestFromWrappedDocument(
  doc: any,
  collectionId: string,
  sortOrder: number,
  folderIdMap: Map<string, string> = new Map(),
): SavedRequest {
  const now = Date.now();
  const wrapped = doc.request;
  if (wrapped.request) {
    return {
      ...wrapped,
      id: id(),
      collectionId,
      folderId: remapFolderId(wrapped.folderId, folderIdMap),
      protocol: wrapped.protocol ?? "rest",
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    id: id(),
    collectionId,
    folderId: remapFolderId(wrapped.folderId, folderIdMap),
    name: wrapped.name ?? "Imported request",
    protocol: "rest",
    request: toRequestConfig(wrapped),
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

function parseYamlDocument(content: string) {
  return yaml.load(content, { schema: yaml.JSON_SCHEMA }) as any;
}

function keyValuesToRecord(items: KeyValue[] = []) {
  return Object.fromEntries(
    items
      .filter((item) => item.enabled !== false && item.key.trim())
      .map((item) => [item.key.trim(), item.value]),
  );
}

function bodyModeToYaml(mode: BodyMode): YamlBodyType {
  if (mode === "raw") return "text";
  if (mode === "urlencoded") return "form-urlencoded";
  if (mode === "file") return "file";
  return mode as YamlBodyType;
}

function yamlBodyToMode(mode: string | undefined): BodyMode {
  if (mode === "text") return "raw";
  if (mode === "form-urlencoded") return "urlencoded";
  if (mode === "form-data" || mode === "json" || mode === "none") return mode;
  return "none";
}

function sortFoldersForExport(folders: Folder[]) {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  return [...folders].sort((left, right) => {
    const depth =
      folderDepth(left, foldersById) - folderDepth(right, foldersById);
    return (
      depth ||
      (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
      left.name.localeCompare(right.name)
    );
  });
}

function folderDepth(folder: Folder, foldersById: Map<string, Folder>) {
  let depth = 0;
  let current = folder.parentFolderId
    ? foldersById.get(folder.parentFolderId)
    : undefined;
  while (current) {
    depth += 1;
    current = current.parentFolderId
      ? foldersById.get(current.parentFolderId)
      : undefined;
  }
  return depth;
}

function folderPath(folder: Folder, foldersById: Map<string, Folder>) {
  const parts = [slug(folder.name)];
  let current = folder.parentFolderId
    ? foldersById.get(folder.parentFolderId)
    : undefined;
  while (current) {
    parts.unshift(slug(current.name));
    current = current.parentFolderId
      ? foldersById.get(current.parentFolderId)
      : undefined;
  }
  return parts.join("/");
}

function exportFolderPaths(folders: Folder[]) {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const siblings = new Map<string, Folder[]>();
  for (const folder of folders) {
    const parentKey = folder.parentFolderId ?? "root";
    siblings.set(parentKey, [...(siblings.get(parentKey) ?? []), folder]);
  }
  const slugById = new Map<string, string>();
  for (const group of siblings.values()) {
    const used = new Set<string>();
    for (const folder of group.sort(sortByOrderThenName)) {
      slugById.set(folder.id, uniqueSlug(folder.name, used));
    }
  }
  return new Map(
    folders.map((folder) => [
      folder.id,
      folderExportPath(folder, foldersById, slugById),
    ]),
  );
}

function folderExportPath(
  folder: Folder,
  foldersById: Map<string, Folder>,
  slugById: Map<string, string>,
) {
  const parts = [slugById.get(folder.id) ?? slug(folder.name)];
  let current = folder.parentFolderId
    ? foldersById.get(folder.parentFolderId)
    : undefined;
  while (current) {
    parts.unshift(slugById.get(current.id) ?? slug(current.name));
    current = current.parentFolderId
      ? foldersById.get(current.parentFolderId)
      : undefined;
  }
  return parts.join("/");
}

function uniqueRequestFileName(
  name: string,
  path: string,
  usedByPath: Map<string, Set<string>>,
) {
  const used = usedByPath.get(path) ?? new Set<string>();
  usedByPath.set(path, used);
  return `${uniqueSlug(name, used)}.invoke.yaml`;
}

function uniqueSlug(name: string, used: Set<string>) {
  const base = slug(name);
  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function sortByOrderThenName(left: Folder, right: Folder) {
  return (
    (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
    left.name.localeCompare(right.name)
  );
}
