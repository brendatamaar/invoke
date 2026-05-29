import { emptyRequest, id, toRequestConfig } from "../request";
import type {
  AuthConfig,
  BodyMode,
  Collection,
  Environment,
  Folder,
  HttpMethod,
  SavedRequest,
} from "../types";
import { recordToKeyValues } from "./shared";

export function importHoppscotchCollection(doc: any) {
  const now = Date.now();
  const rootCollection = Array.isArray(doc?.collections) ? doc.collections[0] : doc;
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
      requests.push(hoppscotchRequest(collection.id, folderId, item, now + requests.length));
  };

  visitRequests(rootCollection?.requests ?? doc?.requests ?? [], null);
  for (const folder of rootCollection?.folders ?? doc?.folders ?? []) visitFolder(folder, null);

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
  const content = typeof body === "string" ? body : (body.body ?? body.content ?? "");
  if (!content) return { mode: "none", content: "" };
  const contentType = String(body.contentType ?? item.contentType ?? "");
  if (contentType.includes("json")) return { mode: "json", content };
  if (contentType.includes("x-www-form-urlencoded")) return { mode: "urlencoded", content };
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
