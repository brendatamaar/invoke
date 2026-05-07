import SwaggerParser from "@apidevtools/swagger-parser";
import yaml from "js-yaml";
import JSZip from "jszip";
import { slug } from "./format";
import { emptyRequest, id, toRequestConfig } from "./request";
import type {
  AuthConfig,
  BodyMode,
  Collection,
  Environment,
  Folder,
  GraphQLRequestConfig,
  FlatRequestDocument,
  FolderDocument,
  HttpMethod,
  KeyValue,
  RequestConfig,
  RequestProtocol,
  SavedRequest,
  YamlBodyType,
} from "./types";

const INVOKE_YAML_VERSION = "1.0";
const EXTERNAL_REF_ERROR = "external $ref not supported in browser context";

export function parseCurl(command: string): Partial<RequestConfig> {
  const tokens =
    command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(stripQuotes) ?? [];
  const request = emptyRequest();
  if (tokens[0] !== "curl") return {};
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "-X" || token === "--request") {
      request.method = tokens[++i]?.toUpperCase() as HttpMethod;
    } else if (token === "-H" || token === "--header") {
      const [key, ...rest] = (tokens[++i] ?? "").split(":");
      request.headers.push({
        key: key.trim(),
        value: rest.join(":").trim(),
        enabled: true,
      });
    } else if (
      ["-d", "--data", "--data-raw", "--data-binary"].includes(token)
    ) {
      request.method = request.method === "GET" ? "POST" : request.method;
      request.bodyMode = "raw";
      request.body = tokens[++i] ?? "";
    } else if (!token.startsWith("-")) {
      request.url = token;
    }
  }
  const authHeader = request.headers.find(
    (header) => header.key.toLowerCase() === "authorization",
  );
  if (authHeader?.value.toLowerCase().startsWith("bearer ")) {
    request.auth = { type: "bearer", token: authHeader.value.slice(7) };
  }
  return request;
}

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

export function importPostmanCollection(doc: any) {
  const now = Date.now();
  const collection: Collection = {
    id: id(),
    name: doc?.info?.name ?? "Postman import",
    variables: [],
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  };
  const folders: Folder[] = [];
  const requests: SavedRequest[] = [];
  const visit = (items: any[], parentFolderId: string | null = null) => {
    for (const item of items ?? []) {
      let folderId = parentFolderId;
      if (item.item) {
        const folder: Folder = {
          id: id(),
          collectionId: collection.id,
          parentFolderId,
          name: item.name ?? "Imported folder",
          variables: [],
          sortOrder: now + folders.length,
          createdAt: now,
          updatedAt: now,
        };
        folders.push(folder);
        folderId = folder.id;
        visit(item.item, folder.id);
      }
      if (!item.request) continue;
      const raw = item.request;
      const url = typeof raw.url === "string" ? raw.url : (raw.url?.raw ?? "");
      const body = raw.body?.raw ?? "";
      const requestNow = Date.now();
      const request = toRequestConfig({
        ...emptyRequest(),
        method: (raw.method ?? "GET").toUpperCase() as HttpMethod,
        url,
        headers: (raw.header ?? []).map((h: any) => ({
          key: h.key,
          value: h.value,
          enabled: !h.disabled,
        })),
        auth: postmanAuth(raw.auth),
        bodyMode: body ? "raw" : "none",
        body,
      });
      requests.push({
        id: id(),
        collectionId: collection.id,
        folderId,
        name: item.name ?? raw.method + " " + url,
        protocol: "rest",
        request,
        sortOrder: requestNow,
        createdAt: requestNow,
        updatedAt: requestNow,
      });
    }
  };
  visit(doc?.item ?? []);
  return { collection, folders, requests };
}

export function importInsomniaExport(doc: any) {
  const resources = Array.isArray(doc?.resources) ? doc.resources : [];
  const now = Date.now();
  const workspace = resources.find((item: any) => item?._type === "workspace");
  const collection: Collection = {
    id: id(),
    name: workspace?.name ?? doc?.name ?? "Insomnia import",
    variables: [],
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  };

  const folderMap = new Map<string, Folder>();
  const groupResources = resources.filter(
    (item: any) => item?._type === "request_group",
  );
  for (const group of groupResources) {
    folderMap.set(group._id, {
      id: id(),
      collectionId: collection.id,
      parentFolderId: null,
      name: group.name ?? "Imported folder",
      variables: [],
      sortOrder: now + folderMap.size,
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const group of groupResources) {
    const folder = folderMap.get(group._id);
    if (!folder) continue;
    folder.parentFolderId =
      group.parentId && folderMap.has(group.parentId)
        ? folderMap.get(group.parentId)!.id
        : null;
  }

  const requests: SavedRequest[] = resources
    .filter((item: any) => item?._type === "request")
    .map((item: any, index: number) => {
      const body = insomniaBody(item.body);
      const request = toRequestConfig({
        ...emptyRequest(),
        method: (item.method ?? "GET").toUpperCase() as HttpMethod,
        url: item.url ?? "",
        headers: (item.headers ?? []).map((header: any) => ({
          key: header.name ?? header.key ?? "",
          value: header.value ?? "",
          enabled: !header.disabled,
        })),
        auth: insomniaAuth(item.authentication),
        bodyMode: body.mode,
        body: body.content,
      });
      return {
        id: id(),
        collectionId: collection.id,
        folderId:
          item.parentId && folderMap.has(item.parentId)
            ? folderMap.get(item.parentId)!.id
            : null,
        name: item.name ?? `${request.method} ${request.url}`,
        protocol: "rest",
        request,
        sortOrder: now + index,
        createdAt: now,
        updatedAt: now,
      };
    });

  const environments = resources
    .filter(
      (item: any) =>
        item?._type === "environment" &&
        item.name &&
        item.data &&
        Object.keys(item.data).length > 0,
    )
    .map(
      (item: any, index: number): Environment => ({
        id: id(),
        name: item.name,
        variables: recordToKeyValues(item.data),
        createdAt: now + index,
        updatedAt: now + index,
      }),
    );

  return {
    collection,
    folders: [...folderMap.values()],
    requests,
    environments,
  };
}

export function importHoppscotchCollection(doc: any) {
  const now = Date.now();
  const rootCollection = Array.isArray(doc?.collections)
    ? doc.collections[0]
    : doc;
  const collection: Collection = {
    id: id(),
    name: rootCollection?.name ?? doc?.name ?? "Hoppscotch import",
    variables: [],
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  };
  const folders: Folder[] = [];
  const requests: SavedRequest[] = [];

  const visitFolder = (node: any, parentFolderId: string | null = null) => {
    const folder: Folder = {
      id: id(),
      collectionId: collection.id,
      parentFolderId,
      name: node?.name ?? "Imported folder",
      variables: [],
      sortOrder: now + folders.length,
      createdAt: now,
      updatedAt: now,
    };
    folders.push(folder);
    visitRequests(node?.requests ?? [], folder.id);
    for (const child of node?.folders ?? []) visitFolder(child, folder.id);
  };

  const visitRequests = (items: any[], folderId: string | null) => {
    for (const item of items ?? [])
      requests.push(
        hoppscotchRequest(collection.id, folderId, item, now + requests.length),
      );
  };

  visitRequests(rootCollection?.requests ?? doc?.requests ?? [], null);
  for (const folder of rootCollection?.folders ?? doc?.folders ?? [])
    visitFolder(folder, null);

  const environments = (doc?.environments ?? doc?.envs ?? [])
    .filter((env: any) => env?.name)
    .map(
      (env: any, index: number): Environment => ({
        id: id(),
        name: env.name,
        variables: hoppscotchVariables(env),
        createdAt: now + index,
        updatedAt: now + index,
      }),
    );

  return { collection, folders, requests, environments };
}

export async function importOpenApiSpec(
  input: string | Record<string, unknown>,
  sourceName = "OpenAPI import",
) {
  try {
    const rawDoc = typeof input === "string" ? parseYamlDocument(input) : input;
    assertOpenApiDocument(rawDoc);
    assertNoExternalRefs(rawDoc);
    const doc = (await SwaggerParser.dereference(clonePlain(rawDoc), {
      resolve: { external: false },
    } as SwaggerParser.Options)) as any;
    assertOpenApiDocument(doc);

    const now = Date.now();
    const collection: Collection = {
      id: id(),
      name: doc.info?.title ?? sourceName,
      description: doc.info?.description,
      variables: [],
      sortOrder: now,
      createdAt: now,
      updatedAt: now,
    };
    const environments = environmentsFromServers(doc, now);
    const serverUrl =
      environments.length > 0 ? "{{base_url}}" : normalizeServerUrl("");
    const foldersByTag = new Map<string, Folder>();
    const requests: SavedRequest[] = [];
    const methods = new Set([
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "head",
      "options",
    ]);

    for (const [rawPath, pathItem] of Object.entries(doc.paths ?? {})) {
      if (!pathItem || typeof pathItem !== "object") continue;
      for (const [rawMethod, operation] of Object.entries(
        pathItem as Record<string, any>,
      )) {
        if (
          !methods.has(rawMethod) ||
          !operation ||
          typeof operation !== "object"
        )
          continue;

        const tag = operation.tags?.[0] ? String(operation.tags[0]) : "";
        const folder = tag
          ? folderForTag(
              collection.id,
              foldersByTag,
              tag,
              now + foldersByTag.size,
            )
          : undefined;
        const parameters = [
          ...((pathItem as any).parameters ?? []),
          ...(operation.parameters ?? []),
        ];
        const path = pathWithVariables(rawPath);
        const request = toRequestConfig({
          ...emptyRequest(),
          method: rawMethod.toUpperCase() as HttpMethod,
          url: `${serverUrl}${path}`,
          params: parameters
            .filter((parameter) => parameter?.in === "query")
            .map((parameter) => ({
              key: parameter.name,
              value: `{{${parameter.name}}}`,
              enabled: true,
            })),
          headers: parameters
            .filter((parameter) => parameter?.in === "header")
            .map((parameter) => ({
              key: parameter.name,
              value: `{{${parameter.name}}}`,
              enabled: true,
            })),
          bodyMode: operation.requestBody ? "json" : "none",
          body: operation.requestBody
            ? JSON.stringify(
                exampleFromRequestBody(operation.requestBody),
                null,
                2,
              )
            : "",
          timeoutMs: 30000,
        });
        requests.push({
          id: id(),
          collectionId: collection.id,
          folderId: folder?.id ?? null,
          name:
            operation.operationId ??
            operation.summary ??
            `${request.method} ${rawPath}`,
          protocol: "rest",
          request,
          sortOrder: now + requests.length,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      collection,
      folders: [...foldersByTag.values()],
      requests,
      environments,
    };
  } catch (error) {
    throw openApiImportError(error);
  }
}

export function importHarFile(doc: any): {
  collection: Collection;
  folders: Folder[];
  requests: SavedRequest[];
} {
  const now = Date.now();
  const entries: any[] = doc?.log?.entries ?? [];
  const collectionName: string =
    doc?.log?.creator?.name
      ? `${doc.log.creator.name} (HAR)`
      : "HAR import";

  const collection: Collection = {
    id: id(),
    name: collectionName,
    variables: [],
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  };

  const SKIP_HEADERS = new Set([
    "host",
    "content-length",
    "transfer-encoding",
    ":authority",
    ":method",
    ":path",
    ":scheme",
  ]);

  const requests: SavedRequest[] = entries.map((entry: any, i: number) => {
    const req = entry?.request ?? {};
    const rawUrl: string = req.url ?? "";
    const method: HttpMethod = ((req.method ?? "GET") as string).toUpperCase() as HttpMethod;

    let cleanUrl = rawUrl;
    try {
      const parsed = new URL(rawUrl);
      cleanUrl = parsed.origin + parsed.pathname;
    } catch {
      cleanUrl = rawUrl.split("?")[0] ?? rawUrl;
    }

    const headers: KeyValue[] = (req.headers ?? [])
      .filter((h: any) => !SKIP_HEADERS.has((h.name ?? "").toLowerCase()))
      .map((h: any) => ({ key: h.name ?? "", value: h.value ?? "", enabled: true }));

    const params: KeyValue[] = (req.queryString ?? []).map((q: any) => ({
      key: q.name ?? "",
      value: q.value ?? "",
      enabled: true,
    }));

    let bodyMode: BodyMode = "none";
    let body = "";
    if (req.postData) {
      const mime: string = req.postData.mimeType ?? "";
      body = req.postData.text ?? "";
      if (mime.includes("json")) bodyMode = "json";
      else if (mime.includes("x-www-form-urlencoded")) bodyMode = "urlencoded";
      else bodyMode = "raw";
    }

    const entryNow = now + i;
    return {
      id: id(),
      collectionId: collection.id,
      folderId: null,
      name: `${method} ${new URL(rawUrl.startsWith("http") ? rawUrl : `http://x${rawUrl}`).pathname || "/"}`,
      protocol: "rest" as RequestProtocol,
      request: toRequestConfig({
        ...emptyRequest(),
        method,
        url: cleanUrl,
        params,
        headers,
        bodyMode,
        body,
      }),
      sortOrder: entryNow,
      createdAt: entryNow,
      updatedAt: entryNow,
    };
  });

  return { collection, folders: [], requests };
}

export function exportCollectionAsOpenApi(
  collection: Collection,
  requests: SavedRequest[],
  folders: Folder[] = [],
): string {
  const foldersById = new Map(folders.map((f) => [f.id, f]));
  const colRequests = requests.filter(
    (r) => r.collectionId === collection.id && r.protocol === "rest",
  );

  const SKIP_HEADERS = new Set([
    "content-type",
    "accept",
    "authorization",
    "content-length",
  ]);

  const paths: Record<string, Record<string, unknown>> = {};

  for (const saved of colRequests) {
    const req = saved.request as RequestConfig;
    if (!req.url) continue;

    let urlPath = "/";
    try {
      urlPath = new URL(req.url).pathname || "/";
    } catch {
      urlPath = req.url.startsWith("/") ? req.url : `/${req.url}`;
    }
    urlPath = urlPath.replace(/\{\{([^}]+)\}\}/g, "{$1}");

    const method = req.method.toLowerCase();
    if (!paths[urlPath]) paths[urlPath] = {};

    const folderName = saved.folderId
      ? foldersById.get(saved.folderId)?.name
      : undefined;

    const parameters: unknown[] = (req.params ?? [])
      .filter((p) => p.enabled !== false && p.key)
      .map((p) => ({
        name: p.key,
        in: "query",
        schema: { type: "string" },
        example: p.value,
      }));

    for (const h of (req.headers ?? []).filter(
      (h) => h.enabled !== false && h.key && !SKIP_HEADERS.has(h.key.toLowerCase()),
    )) {
      parameters.push({
        name: h.key,
        in: "header",
        schema: { type: "string" },
        example: h.value,
      });
    }

    const operation: Record<string, unknown> = {
      summary: saved.name,
      ...(folderName ? { tags: [folderName] } : {}),
      ...(parameters.length ? { parameters } : {}),
      responses: { "200": { description: "OK" } },
    };

    if (req.bodyMode !== "none" && req.body) {
      const mimeByMode: Record<string, string> = {
        json: "application/json",
        urlencoded: "application/x-www-form-urlencoded",
        "form-data": "multipart/form-data",
        raw: "text/plain",
      };
      const contentType = mimeByMode[req.bodyMode] ?? "text/plain";
      operation.requestBody = {
        content: {
          [contentType]: {
            schema: { type: "string" },
            example: req.body,
          },
        },
      };
    }

    paths[urlPath][method] = operation;
  }

  const tagNames = [
    ...new Set(
      colRequests
        .filter((r) => r.folderId)
        .map((r) => foldersById.get(r.folderId!)?.name)
        .filter((n): n is string => Boolean(n)),
    ),
  ];

  const spec: Record<string, unknown> = {
    openapi: "3.0.3",
    info: {
      title: collection.name,
      ...(collection.description ? { description: collection.description } : {}),
      version: "1.0.0",
    },
    ...(tagNames.length ? { tags: tagNames.map((name) => ({ name })) } : {}),
    paths,
  };

  return yaml.dump(spec, { lineWidth: 120 });
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

function insomniaBody(body: any): { mode: BodyMode; content: string } {
  if (!body || !body.mimeType) return { mode: "none", content: "" };
  const content = body.text ?? "";
  if (!content) return { mode: "none", content: "" };
  if (String(body.mimeType).includes("json")) return { mode: "json", content };
  if (String(body.mimeType).includes("x-www-form-urlencoded"))
    return { mode: "urlencoded", content };
  return { mode: "raw", content };
}

function insomniaAuth(authentication: any): AuthConfig {
  if (!authentication?.type) return { type: "none" };
  if (authentication.type === "bearer")
    return { type: "bearer", token: authentication.token ?? "" };
  if (authentication.type === "basic") {
    return {
      type: "basic",
      username: authentication.username ?? "",
      password: authentication.password ?? "",
    };
  }
  if (authentication.type === "apikey") {
    return {
      type: "api-key",
      apiKeyName: authentication.key ?? "",
      apiKeyValue: authentication.value ?? "",
      apiKeyIn: authentication.addTo === "queryParams" ? "query" : "header",
    };
  }
  return { type: "none" };
}

function hoppscotchRequest(
  collectionId: string,
  folderId: string | null,
  item: any,
  sortOrder: number,
): SavedRequest {
  const now = Date.now();
  const body = hoppscotchBody(item);
  const request = toRequestConfig({
    ...emptyRequest(),
    method: (item.method ?? "GET").toUpperCase() as HttpMethod,
    url: item.endpoint ?? item.url ?? "",
    params: (item.params ?? item.queryParams ?? []).map((param: any) => ({
      key: param.key ?? param.name ?? "",
      value: param.value ?? "",
      enabled: param.active !== false && param.enabled !== false,
    })),
    headers: (item.headers ?? []).map((header: any) => ({
      key: header.key ?? header.name ?? "",
      value: header.value ?? "",
      enabled: header.active !== false && header.enabled !== false,
    })),
    auth: hoppscotchAuth(item.auth),
    bodyMode: body.mode,
    body: body.content,
  });
  return {
    id: id(),
    collectionId,
    folderId,
    name: item.name ?? `${request.method} ${request.url}`,
    protocol: "rest",
    request,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

function hoppscotchBody(item: any): { mode: BodyMode; content: string } {
  const body = item.body ?? item.requestBody;
  if (!body) return { mode: "none", content: "" };
  const content =
    typeof body === "string" ? body : (body.body ?? body.content ?? "");
  if (!content) return { mode: "none", content: "" };
  const contentType = String(body.contentType ?? item.contentType ?? "");
  if (contentType.includes("json")) return { mode: "json", content };
  if (contentType.includes("x-www-form-urlencoded"))
    return { mode: "urlencoded", content };
  return { mode: "raw", content };
}

function hoppscotchAuth(auth: any): AuthConfig {
  if (!auth?.authType || auth.authType === "none") return { type: "none" };
  if (auth.authType === "bearer")
    return { type: "bearer", token: auth.authToken ?? auth.token ?? "" };
  if (auth.authType === "basic")
    return {
      type: "basic",
      username: auth.username ?? "",
      password: auth.password ?? "",
    };
  if (auth.authType === "api-key") {
    return {
      type: "api-key",
      apiKeyName: auth.key ?? "",
      apiKeyValue: auth.value ?? "",
      apiKeyIn: auth.addTo === "queryParams" ? "query" : "header",
    };
  }
  return { type: "none" };
}

function hoppscotchVariables(env: any) {
  const variables = env.variables ?? env.envVars ?? [];
  if (Array.isArray(variables)) {
    return variables.map((variable: any) => ({
      key: variable.key ?? variable.name ?? "",
      value: variable.value ?? "",
      enabled: variable.active !== false && variable.enabled !== false,
    }));
  }
  return recordToKeyValues(variables);
}

function postmanAuth(auth: any): RequestConfig["auth"] {
  if (!auth?.type) return { type: "none" };
  const values = Object.fromEntries(
    (auth[auth.type] ?? []).map((item: any) => [item.key, item.value]),
  );
  if (auth.type === "bearer")
    return { type: "bearer", token: values.token ?? "" };
  if (auth.type === "basic")
    return {
      type: "basic",
      username: values.username ?? "",
      password: values.password ?? "",
    };
  if (auth.type === "apikey") {
    return {
      type: "api-key",
      apiKeyName: values.key ?? "",
      apiKeyValue: values.value ?? "",
      apiKeyIn: values.in === "query" ? "query" : "header",
    };
  }
  return { type: "none" };
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

function recordToKeyValues(value: Record<string, string> | KeyValue[] = {}) {
  if (Array.isArray(value)) return value;
  return Object.entries(value).map(([key, raw]) => ({
    key,
    value: String(raw),
    enabled: true,
  }));
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

function normalizeServerUrl(value: string) {
  const trimmed = String(value ?? "").replace(/\/$/, "");
  return trimmed || "{{base_url}}";
}

function environmentsFromServers(doc: any, now: number): Environment[] {
  const servers = Array.isArray(doc.servers) ? doc.servers : [];
  return servers
    .filter(
      (server: any) => typeof server?.url === "string" && server.url.trim(),
    )
    .map((server: any, index: number) => ({
      id: id(),
      name:
        server.description ||
        `${doc.info?.title ?? "OpenAPI"} server ${index + 1}`,
      variables: [
        {
          key: "base_url",
          value: normalizeServerUrl(server.url),
          enabled: true,
        },
      ],
      createdAt: now + index,
      updatedAt: now + index,
    }));
}

function pathWithVariables(path: string) {
  return path.replace(
    /\{([^}]+)\}/g,
    (_match, name: string) => `{{${name.trim()}}}`,
  );
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

function folderForTag(
  collectionId: string,
  folders: Map<string, Folder>,
  tag: string,
  sortOrder: number,
) {
  const existing = folders.get(tag);
  if (existing) return existing;
  const now = Date.now();
  const folder: Folder = {
    id: id(),
    collectionId,
    parentFolderId: null,
    name: tag,
    variables: [],
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  folders.set(tag, folder);
  return folder;
}

function exampleFromRequestBody(requestBody: any) {
  const content = requestBody?.content ?? {};
  const json = content["application/json"] ?? Object.values(content)[0];
  const firstExample = Object.values(json?.examples ?? {})[0] as
    | { value?: unknown }
    | undefined;
  return (
    json?.example ?? firstExample?.value ?? exampleFromSchema(json?.schema)
  );
}

function exampleFromSchema(
  schema: any,
  stack = new WeakSet<object>(),
): unknown {
  if (!schema || typeof schema !== "object") return {};
  if (stack.has(schema)) return {};
  stack.add(schema);

  try {
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum?.length) return schema.enum[0];

    const allOfExamples = Array.isArray(schema.allOf)
      ? schema.allOf.map((part: any) => exampleFromSchema(part, stack))
      : [];
    const ownProperties = Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, property]) => [
        key,
        exampleFromSchema(property, stack),
      ]),
    );
    const type =
      schema.type ??
      (schema.properties || allOfExamples.length ? "object" : undefined);

    if (type === "object") {
      return mergeExampleObjects([...allOfExamples, ownProperties]);
    }
    if (type === "array") return [exampleFromSchema(schema.items, stack)];
    if (type === "integer" || type === "number") return 0;
    if (type === "boolean") return true;
    if (type === "string") return "string";
    return firstDefined(allOfExamples) ?? {};
  } finally {
    stack.delete(schema);
  }
}

function mergeExampleObjects(values: unknown[]) {
  const result: Record<string, unknown> = {};
  for (const value of values) {
    if (!isPlainObject(value)) continue;
    for (const [key, raw] of Object.entries(value)) {
      result[key] =
        isPlainObject(result[key]) && isPlainObject(raw)
          ? mergeExampleObjects([result[key], raw])
          : raw;
    }
  }
  return result;
}

function firstDefined(values: unknown[]) {
  return values.find((value) => value !== undefined);
}

function assertOpenApiDocument(doc: any) {
  if (
    !isPlainObject(doc) ||
    typeof doc.openapi !== "string" ||
    !doc.openapi.startsWith("3.")
  ) {
    throw new Error("Only OpenAPI 3.x documents are supported");
  }
  if (
    !isPlainObject(doc.info) ||
    typeof doc.info.title !== "string" ||
    !doc.info.title.trim()
  ) {
    throw new Error("OpenAPI document is missing required info.title");
  }
  if (!isPlainObject(doc.paths)) {
    throw new Error("OpenAPI document is missing required paths object");
  }
}

function assertNoExternalRefs(value: unknown) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoExternalRefs);
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.$ref === "string" && !record.$ref.startsWith("#/")) {
    throw new Error(`${EXTERNAL_REF_ERROR}: ${record.$ref}`);
  }
  Object.values(record).forEach(assertNoExternalRefs);
}

function openApiImportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("OpenAPI import failed:"))
    return error instanceof Error ? error : new Error(message);
  return new Error(`OpenAPI import failed: ${message}`);
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
