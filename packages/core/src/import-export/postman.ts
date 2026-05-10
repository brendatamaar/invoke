import { emptyRequest, id, toRequestConfig } from "../request";
import type { Collection, Folder, HttpMethod, RequestConfig, SavedRequest } from "../types";

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
