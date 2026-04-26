import "fake-indexeddb/auto";
import Dexie from "dexie";
import yaml from "js-yaml";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  emptyRequest,
  exportCollectionZip,
  extractVariables,
  importInvokeZip,
  importYamlFiles,
  InvokeStore,
  parseCurl,
  resolveRequest,
  resolveTemplate,
  toRequestConfig,
  type Collection,
  type SavedRequest
} from "./index";

beforeEach(async () => {
  await Dexie.delete("invoke-alpha");
});

afterEach(async () => {
  await Dexie.delete("invoke-alpha");
});

describe("variables", () => {
  it("resolves environment and dynamic variables", () => {
    const result = resolveTemplate("{{base_url}}/{{$randomInt}}", { base_url: "https://api.example.com" });
    expect(result.value).toMatch(/^https:\/\/api\.example\.com\/\d+$/);
    expect(result.unresolved).toEqual([]);
  });

  it("tracks unresolved variables", () => {
    const result = resolveTemplate("{{missing}}", {});
    expect(result.value).toBe("{{missing}}");
    expect(result.unresolved).toEqual(["missing"]);
  });
});

describe("request resolution", () => {
  it("applies bearer auth and query params", () => {
    const request = {
      ...emptyRequest(),
      url: "https://example.com/users",
      params: [{ key: "page", value: "1", enabled: true }],
      auth: { type: "bearer" as const, token: "abc" }
    };
    const resolved = resolveRequest(request);
    expect(resolved.request.url).toBe("https://example.com/users?page=1");
    expect(resolved.request.headers).toContainEqual({ key: "Authorization", value: "Bearer abc", enabled: true });
  });

  it("resolves Basic auth variables before encoding credentials", () => {
    const request = {
      ...emptyRequest(),
      url: "https://example.com/me",
      auth: { type: "basic" as const, username: "{{username}}", password: "{{password}}" }
    };
    const resolved = resolveRequest(request, [{ variables: { username: "ada", password: "lovelace" } }]);
    expect(resolved.request.headers).toContainEqual({
      key: "Authorization",
      value: `Basic ${Buffer.from("ada:lovelace").toString("base64")}`,
      enabled: true
    });
  });

  it("resolves API key query auth before building the URL", () => {
    const request = {
      ...emptyRequest(),
      url: "https://example.com/me",
      auth: { type: "api-key" as const, apiKeyName: "api_key", apiKeyValue: "{{apiKey}}", apiKeyIn: "query" as const }
    };
    const resolved = resolveRequest(request, [{ variables: { apiKey: "secret value" } }]);
    expect(new URL(resolved.request.url).searchParams.get("api_key")).toBe("secret value");
  });

  it("resolves ordinary query param variables before URL encoding", () => {
    const request = {
      ...emptyRequest(),
      url: "https://example.com/search",
      params: [{ key: "{{queryKey}}", value: "{{queryValue}}", enabled: true }]
    };
    const resolved = resolveRequest(request, [{ variables: { queryKey: "q", queryValue: "hello world" } }]);
    expect(new URL(resolved.request.url).searchParams.get("q")).toBe("hello world");
  });
});

describe("imports", () => {
  it("parses a basic curl command", () => {
    const parsed = parseCurl(`curl -H "Authorization: Bearer xyz" https://api.example.com/me`);
    expect(parsed.url).toBe("https://api.example.com/me");
    expect(parsed.auth?.type).toBe("bearer");
  });

  it("extracts JSONPath variables", () => {
    const values = extractVariables(
      {
        status: 200,
        statusText: "200 OK",
        headers: [],
        body: JSON.stringify({ token: "secret" }),
        timing: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 1, transferMs: 1, totalMs: 2 },
        requestSize: 0,
        responseSize: 18
      },
      [{ name: "token", jsonPath: "$.token" }]
    );
    expect(values.token).toBe("secret");
  });

  it("loads YAML with JSON schema instead of JavaScript tags", async () => {
    const file = new File(["type: !!js/function 'function () { return 1 }'"], "bad.invoke.yaml");
    await expect(importYamlFiles([file])).rejects.toThrow();
  });
});

describe("storage migrations", () => {
  it("migrates Alpha v1 flat requests into v2 protocol-aware envelopes", async () => {
    const alpha = new Dexie("invoke-alpha");
    alpha.version(1).stores({
      collections: "id, name, updatedAt",
      requests: "id, collectionId, name, updatedAt",
      environments: "id, name, updatedAt",
      history: "id, createdAt",
      meta: "key"
    });
    await alpha.table("collections").add({ id: "col_1", name: "Alpha", createdAt: 1, updatedAt: 1 });
    await alpha.table("requests").add({
      id: "req_1",
      collectionId: "col_1",
      name: "List users",
      method: "GET",
      url: "{{base_url}}/users",
      params: [{ key: "page", value: "1", enabled: true }],
      headers: [{ key: "Accept", value: "application/json", enabled: true }],
      bodyMode: "none",
      body: "",
      auth: { type: "none" },
      timeoutMs: 30000,
      createdAt: 2,
      updatedAt: 2
    });
    alpha.close();

    const store = new InvokeStore();
    const [collection] = await store.listCollections();
    const [request] = await store.listRequests("col_1");

    expect(collection.variables).toEqual([]);
    expect(collection.sortOrder).toBe(1);
    expect(request.protocol).toBe("rest");
    expect(request.folderId).toBeNull();
    expect(request.request).toMatchObject({
      method: "GET",
      url: "{{base_url}}/users",
      params: [{ key: "page", value: "1", enabled: true }]
    });
    expect(await store.listFolders("col_1")).toEqual([]);
    store.close();
  });
});

describe("invoke YAML", () => {
  it("round-trips a .invoke.zip export back into the same collection structure", async () => {
    const { collection, requests } = fixtureCollection();
    const blob = await exportCollectionZip(collection, requests);
    const imported = await importInvokeZip(blob);

    expect(imported.collection.name).toBe(collection.name);
    expect(imported.requests).toHaveLength(1);
    expect(imported.requests[0].name).toBe(requests[0].name);
    expect(imported.requests[0].protocol).toBe("rest");
    expect(imported.requests[0].request).toMatchObject({
      method: "POST",
      url: "{{base_url}}/users",
      bodyMode: "json",
      body: '{ "name": "Ada" }'
    });
  });

  it("exports request YAML in the PRD flat request format", async () => {
    const { collection, requests } = fixtureCollection();
    const blob = await exportCollectionZip(collection, requests);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const requestEntry = Object.values(zip.files).find((entry) => entry.name.endsWith("create-user.invoke.yaml"));
    expect(requestEntry).toBeDefined();

    const doc = yaml.load(await requestEntry!.async("string")) as any;
    expect(doc.request).toBeUndefined();
    expect(doc).toMatchObject({
      invoke_version: "1.0",
      type: "request",
      name: "Create user",
      protocol: "rest",
      method: "POST",
      url: "{{base_url}}/users",
      headers: { "Content-Type": "application/json" },
      body: { type: "json", content: '{ "name": "Ada" }' }
    });
  });
});

function fixtureCollection(): { collection: Collection; requests: SavedRequest[] } {
  const collection: Collection = {
    id: "col_1",
    name: "JSONPlaceholder",
    variables: [{ key: "base_url", value: "https://jsonplaceholder.typicode.com", enabled: true }],
    sortOrder: 1,
    createdAt: 1,
    updatedAt: 1
  };
  const request = toRequestConfig({
    ...emptyRequest(),
    method: "POST",
    url: "{{base_url}}/users",
    headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
    bodyMode: "json",
    body: '{ "name": "Ada" }'
  });
  return {
    collection,
    requests: [
      {
        id: "req_1",
        collectionId: collection.id,
        folderId: null,
        name: "Create user",
        protocol: "rest",
        request,
        sortOrder: 1,
        createdAt: 1,
        updatedAt: 1
      }
    ]
  };
}
