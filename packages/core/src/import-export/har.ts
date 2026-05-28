import { emptyRequest, id, toRequestConfig } from "../request";
import type {
  BodyMode,
  Collection,
  Folder,
  HttpMethod,
  KeyValue,
  RequestProtocol,
  SavedRequest,
} from "../types";

export function importHarFile(doc: any): {
  collection: Collection;
  folders: Folder[];
  requests: SavedRequest[];
} {
  const now = Date.now();
  const entries: any[] = doc?.log?.entries ?? [];
  const collectionName: string = doc?.log?.creator?.name
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

  const skipHeaders = new Set([
    "host",
    "content-length",
    "transfer-encoding",
    ":authority",
    ":method",
    ":path",
    ":scheme",
    ":status",
  ]);

  const requests: SavedRequest[] = entries.map((entry: any, i: number) => {
    const req = entry?.request ?? {};
    const rawUrl: string = req.url ?? "";
    const method = ((req.method ?? "GET") as string).toUpperCase() as HttpMethod;
    const parsedUrl = safeUrl(rawUrl);
    const cleanUrl = parsedUrl
      ? `${parsedUrl.origin}${parsedUrl.pathname}`
      : (rawUrl.split("?")[0] ?? rawUrl);

    const headers: KeyValue[] = (req.headers ?? [])
      .filter((h: any) => {
        const name = String(h.name ?? "").trim();
        return name && !skipHeaders.has(name.toLowerCase());
      })
      .map((h: any) => ({
        key: h.name ?? "",
        value: h.value ?? "",
        enabled: true,
      }));

    const harParams = Array.isArray(req.queryString) ? req.queryString : [];
    const params: KeyValue[] = (
      harParams.length > 0
        ? harParams
        : parsedUrl
          ? [...parsedUrl.searchParams.entries()].map(([name, value]) => ({
              name,
              value,
            }))
          : harQueryParams(rawUrl)
    ).map((q: any) => ({
      key: q.name ?? "",
      value: q.value ?? "",
      enabled: true,
    }));

    const body = harPostData(req.postData);

    const entryNow = now + i;
    return {
      id: id(),
      collectionId: collection.id,
      folderId: null,
      name: `${method} ${harPathName(rawUrl)}`,
      protocol: "rest" as RequestProtocol,
      request: toRequestConfig({
        ...emptyRequest(),
        method,
        url: cleanUrl,
        params,
        headers,
        bodyMode: body.mode,
        body: body.content,
      }),
      sortOrder: entryNow,
      createdAt: entryNow,
      updatedAt: entryNow,
    };
  });

  return { collection, folders: [], requests };
}

function safeUrl(rawUrl: string) {
  try {
    return new URL(rawUrl);
  } catch {
    return undefined;
  }
}

function harPathName(rawUrl: string) {
  const parsed = safeUrl(rawUrl.startsWith("http") ? rawUrl : `http://invoke.local${rawUrl}`);
  if (parsed) return parsed.pathname || "/";
  const withoutQuery = rawUrl.split("?")[0] ?? rawUrl;
  return withoutQuery.startsWith("/") ? withoutQuery || "/" : `/${withoutQuery || ""}`;
}

function harQueryParams(rawUrl: string) {
  const query = rawUrl.split("?")[1]?.split("#")[0];
  if (!query) return [];
  return [...new URLSearchParams(query).entries()].map(([name, value]) => ({
    name,
    value,
  }));
}

function harPostData(postData: any): { mode: BodyMode; content: string } {
  if (!postData) return { mode: "none", content: "" };
  const mime = String(postData.mimeType ?? "").toLowerCase();
  const params = Array.isArray(postData.params) ? postData.params : [];
  const paramRows = params.map((param: any) => ({
    key: param.name ?? "",
    value: param.value ?? "",
    enabled: true,
  }));

  if (mime.includes("json")) return { mode: "json", content: postData.text ?? "" };
  if (mime.includes("x-www-form-urlencoded")) {
    return {
      mode: "urlencoded",
      content: paramRows.length ? JSON.stringify(paramRows) : (postData.text ?? ""),
    };
  }
  if (mime.includes("multipart/form-data")) {
    return {
      mode: "form-data",
      content: paramRows.length ? JSON.stringify(paramRows) : (postData.text ?? ""),
    };
  }

  const content = postData.text ?? "";
  return { mode: content ? "raw" : "none", content };
}
