import { Effect } from "effect";
import { ParseError } from "../errors";
import { emptyGrpcRequest, emptyRequest, id, toRequestConfig } from "../request";
import type {
  Collection,
  Folder,
  GrpcRequestConfig,
  HttpMethod,
  KeyValue,
  RequestConfig,
  SavedRequest,
} from "../types";

function postmanVars(vars: any[]): KeyValue[] {
  return (vars ?? []).map((v: any) => ({
    key: v.key ?? "",
    value: v.value ?? "",
    enabled: v.enabled !== false,
    sensitive: v.type === "secret",
  }));
}

function postmanBody(rawBody: any): { bodyMode: RequestConfig["bodyMode"]; body: string } {
  if (!rawBody) return { bodyMode: "none", body: "" };
  const mode = rawBody.mode;
  if (mode === "raw") {
    const text = rawBody.raw ?? "";
    const lang = rawBody.options?.raw?.language;
    return { bodyMode: lang === "json" ? "json" : "raw", body: text };
  }
  if (mode === "formdata") {
    const rows: KeyValue[] = (rawBody.formdata ?? []).map((f: any) => ({
      key: f.key ?? "",
      value: f.type === "file" ? "" : (f.value ?? ""),
      enabled: f.disabled !== true,
      type: f.type === "file" ? "file" : "text",
      fileName: f.type === "file" ? (f.src ?? "") : undefined,
    }));
    return { bodyMode: "form-data", body: JSON.stringify(rows) };
  }
  if (mode === "urlencoded") {
    const rows: KeyValue[] = (rawBody.urlencoded ?? []).map((f: any) => ({
      key: f.key ?? "",
      value: f.value ?? "",
      enabled: f.disabled !== true,
      type: "text" as const,
    }));
    return { bodyMode: "urlencoded", body: JSON.stringify(rows) };
  }
  if (mode === "graphql") {
    const query = rawBody.graphql?.query ?? "";
    const variables = rawBody.graphql?.variables ?? "";
    const combined = variables
      ? JSON.stringify(
          { query, variables: typeof variables === "string" ? JSON.parse(variables) : variables },
          null,
          2,
        )
      : JSON.stringify({ query }, null, 2);
    return { bodyMode: "json", body: combined };
  }
  return { bodyMode: "none", body: "" };
}

export function importPostmanCollection(doc: any) {
  const now = Date.now();
  const collection: Collection = {
    id: id(),
    name: doc?.info?.name ?? "Postman import",
    variables: postmanVars(doc?.variable),
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
          variables: postmanVars(item.variable),
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
      if (raw.type === "grpc" || item.protocolProfileBehavior?.protocolVersion === "grpc") {
        requests.push(postmanGrpcItem(item, collection.id, folderId));
        continue;
      }
      const url = typeof raw.url === "string" ? raw.url : (raw.url?.raw ?? "");
      const { bodyMode, body } = postmanBody(raw.body);
      const params: KeyValue[] = (raw.url?.query ?? []).map((q: any) => ({
        key: q.key ?? "",
        value: q.value ?? "",
        enabled: true,
      }));
      const requestNow = Date.now();
      const request = toRequestConfig({
        ...emptyRequest(),
        method: (raw.method ?? "GET").toUpperCase() as HttpMethod,
        url,
        params,
        headers: (raw.header ?? []).map((h: any) => ({
          key: h.key,
          value: h.value,
          enabled: !h.disabled,
        })),
        auth: postmanAuth(raw.auth),
        bodyMode,
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

function postmanAuth(auth: any): RequestConfig["auth"] {
  if (!auth?.type) return { type: "none" };
  const values = Object.fromEntries(
    (auth[auth.type] ?? []).map((item: any) => [item.key, item.value]),
  );
  if (auth.type === "bearer") return { type: "bearer", token: values.token ?? "" };
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

export const importPostmanCollectionEffect = (
  raw: unknown,
): Effect.Effect<ReturnType<typeof importPostmanCollection>, ParseError> =>
  Effect.try({
    try: () => {
      if (!raw || typeof raw !== "object" || !("info" in raw)) {
        throw new Error("not a valid Postman collection: missing info object");
      }
      return importPostmanCollection(raw as any);
    },
    catch: (e) => new ParseError({ format: "postman", message: String(e) }),
  });

function postmanGrpcItem(item: any, collectionId: string, folderId: string | null): SavedRequest {
  const raw = item.request ?? item;
  const url = raw.url?.grpc ?? raw.url?.raw ?? raw.url ?? "";
  const service = raw.service ?? raw.method?.split("/").slice(0, -1).join("/") ?? "";
  const method = raw.method?.split("/").pop() ?? raw.methodName ?? "";
  const metadata = (raw.header ?? raw.metadata ?? []).map((h: any) => ({
    key: h.key ?? h.name ?? "",
    value: h.value ?? "",
    enabled: !h.disabled,
  }));
  const body = raw.body?.raw ?? raw.body?.text ?? raw.body ?? "{}";
  const tls = raw.tls !== false && !url.includes("plaintext");
  const request: GrpcRequestConfig = {
    ...emptyGrpcRequest(),
    address: url.replace(/^grpc:\/\//, "").replace(/^grpcs:\/\//, ""),
    service,
    method,
    metadata,
    body: typeof body === "string" ? body : JSON.stringify(body),
    tls,
    auth: postmanAuth(raw.auth),
  };
  const now = Date.now();
  return {
    id: id(),
    collectionId,
    folderId,
    name: item.name ?? `${service}/${method}`,
    protocol: "grpc",
    request,
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  };
}
