import yaml from "js-yaml";
import JSZip from "jszip";
import { slug } from "./format";
import { emptyRequest, id } from "./request";
import type { Collection, HttpMethod, RequestConfig, SavedRequest } from "./types";

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
  root.file("collection.invoke.yaml", yaml.dump({ invoke_version: "1.0", type: "collection", collection }));
  for (const request of requests) {
    root.file(`${slug(request.name)}.invoke.yaml`, yaml.dump({ invoke_version: "1.0", type: "request", request }));
  }
  return zip.generateAsync({ type: "blob" });
}

export async function importYamlFiles(files: File[]) {
  const parsed = await Promise.all(
    files
      .filter((file) => file.name.endsWith(".yaml") || file.name.endsWith(".yml"))
      .map(async (file) => yaml.load(await file.text(), { schema: yaml.JSON_SCHEMA }) as any)
  );
  const collectionDoc = parsed.find((doc) => doc?.type === "collection");
  const collection: Collection = collectionDoc?.collection ?? {
    id: id(),
    name: "Imported collection",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  const requests = parsed.filter((doc) => doc?.type === "request").map((doc) => doc.request as SavedRequest);
  return { collection: { ...collection, id: id() }, requests };
}

export function importPostmanCollection(doc: any) {
  const collection: Collection = {
    id: id(),
    name: doc?.info?.name ?? "Postman import",
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
      requests.push({
        ...emptyRequest(),
        id: id(),
        collectionId: collection.id,
        name: item.name ?? raw.method + " " + url,
        method: (raw.method ?? "GET").toUpperCase(),
        url,
        headers: (raw.header ?? []).map((h: any) => ({ key: h.key, value: h.value, enabled: !h.disabled })),
        auth: postmanAuth(raw.auth),
        bodyMode: body ? "raw" : "none",
        body,
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as SavedRequest);
    }
  };
  visit(doc?.item ?? []);
  return { collection, requests };
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

function stripQuotes(value: string) {
  return value.replace(/^["']|["']$/g, "");
}
