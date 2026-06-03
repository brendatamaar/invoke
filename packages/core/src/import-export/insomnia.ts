import { Effect } from "effect";
import { ParseError } from "../errors";
import { emptyGrpcRequest, emptyRequest, id, toRequestConfig } from "../request";
import type {
  AuthConfig,
  BodyMode,
  Collection,
  Environment,
  Folder,
  GrpcRequestConfig,
  HttpMethod,
  SavedRequest,
} from "../types";
import { recordToKeyValues } from "./shared";

export const importInsomniaExportEffect = (
  raw: unknown,
): Effect.Effect<ReturnType<typeof importInsomniaExport>, ParseError> =>
  Effect.try({
    try: () => {
      if (!raw || typeof raw !== "object") {
        throw new Error("not a valid Insomnia export: expected an object");
      }
      return importInsomniaExport(raw as any);
    },
    catch: (e) => new ParseError({ format: "insomnia", message: String(e) }),
  });

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
  const groupResources = resources.filter((item: any) => item?._type === "request_group");
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
      group.parentId && folderMap.has(group.parentId) ? folderMap.get(group.parentId)!.id : null;
  }

  const requests: SavedRequest[] = resources
    .filter((item: any) => item?._type === "request" || item?._type === "grpc_request")
    .map((item: any, index: number) => {
      if (item._type === "grpc_request") {
        return insomniaGrpcRequest(item, collection.id, folderMap, now + index);
      }
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
          item.parentId && folderMap.has(item.parentId) ? folderMap.get(item.parentId)!.id : null,
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

function insomniaGrpcRequest(
  item: any,
  collectionId: string,
  folderMap: Map<string, { id: string }>,
  sortOrder: number,
): SavedRequest {
  const url = item.url ?? item.host ?? "";
  const protoMethod = item.protoMethodName ?? item.method ?? "";
  const parts = protoMethod.split("/").filter(Boolean);
  const method = parts.pop() ?? "";
  const service = parts.join("/") || parts.join(".");
  const metadata = (item.metadata ?? item.headers ?? []).map((h: any) => ({
    key: h.name ?? h.key ?? "",
    value: h.value ?? "",
    enabled: !h.disabled,
  }));
  const body = item.body?.text ?? item.body ?? "{}";
  const request: GrpcRequestConfig = {
    ...emptyGrpcRequest(),
    address: url.replace(/^grpcs?:\/\//, ""),
    service,
    method,
    metadata,
    body: typeof body === "string" ? body : JSON.stringify(body),
    tls: url.startsWith("grpcs://") || !url.includes("plaintext"),
    auth: insomniaAuth(item.authentication),
  };
  const now = Date.now();
  return {
    id: id(),
    collectionId,
    folderId:
      item.parentId && folderMap.has(item.parentId) ? folderMap.get(item.parentId)!.id : null,
    name: item.name ?? `${service}/${method}`,
    protocol: "grpc",
    request,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}
