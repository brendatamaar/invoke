import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  emptyGraphQLRequest,
  emptyGrpcRequest,
  emptyRequest,
  emptyWebSocketRequest,
  INITIAL_PROTOCOL_DEFAULTS,
  InvokeStore,
  mergeWithDefaults,
  parseWorkspaceBackup,
  serializeWorkspace,
} from "./index";

beforeEach(async () => {
  await Dexie.delete("invoke-alpha");
});

afterEach(async () => {
  await Dexie.delete("invoke-alpha");
});

describe("storage migrations", () => {
  it("migrates Alpha v1 flat requests into v2 protocol-aware envelopes", async () => {
    const alpha = new Dexie("invoke-alpha");
    alpha.version(1).stores({
      collections: "id, name, updatedAt",
      requests: "id, collectionId, name, updatedAt",
      environments: "id, name, updatedAt",
      history: "id, createdAt",
      meta: "key",
    });
    await alpha
      .table("collections")
      .add({ id: "col_1", name: "Alpha", createdAt: 1, updatedAt: 1 });
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
      updatedAt: 2,
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
      params: [{ key: "page", value: "1", enabled: true }],
    });
    expect(await store.listFolders("col_1")).toEqual([]);
    store.close();
  });

  it("strips moved network options from stored requests, history, and flows", async () => {
    const legacy = new Dexie("invoke-alpha");
    legacy.version(5).stores({
      collections: "id, name, updatedAt, sortOrder",
      folders: "id, collectionId, parentFolderId, name, updatedAt, sortOrder",
      requests:
        "id, collectionId, folderId, name, protocol, updatedAt, sortOrder",
      environments: "id, name, updatedAt",
      history: "id, createdAt, requestId, collectionId, protocol, pinned",
      flows: "id, name, updatedAt",
      meta: "key",
      cookies: "id, domain, [domain+path+name], updatedAt",
    });

    const legacyRequest = {
      ...emptyRequest(),
      timeoutMs: 12000,
      retryPolicy: {
        maxRetries: 2,
        retryOnTimeout: true,
        retryOn5xx: false,
        backoffMs: 250,
      },
      options: {
        followRedirects: false,
        maxRedirects: 1,
        verifySsl: false,
        allowPrivateAddresses: false,
        connectTimeoutMs: 300,
        readTimeoutMs: 700,
        proxy: { type: "http" as const, url: "http://127.0.0.1:8080" },
        tlsClientConfig: { clientKeyPem: "secret" },
      },
    };

    await legacy.table("requests").add({
      id: "req_legacy",
      collectionId: "col_1",
      folderId: null,
      name: "Legacy",
      protocol: "rest",
      request: legacyRequest,
      sortOrder: 1,
      createdAt: 1,
      updatedAt: 1,
      encryptedTlsKey: "encrypted",
    });
    await legacy.table("history").add({
      id: "hist_legacy",
      request: legacyRequest,
      protocol: "rest",
      createdAt: 1,
    });
    await legacy.table("flows").add({
      id: "flow_legacy",
      name: "Legacy flow",
      steps: [
        {
          id: "step_1",
          type: "request",
          name: "Request",
          request: legacyRequest,
        },
      ],
      createdAt: 1,
      updatedAt: 1,
    });
    legacy.close();

    const store = new InvokeStore();
    const [saved] = await store.listRequests();
    const [history] = await store.listHistory();
    const [flow] = await store.listFlows();

    expect(saved.encryptedTlsKey).toBeUndefined();
    expect(saved.request).toMatchObject({
      timeoutMs: 12000,
      retryPolicy: {
        maxRetries: 2,
        retryOnTimeout: true,
        retryOn5xx: false,
        backoffMs: 250,
      },
      options: {},
    });
    expect(history.request).toMatchObject({ timeoutMs: 12000, options: {} });
    expect(flow.steps[0]).toMatchObject({
      type: "request",
      request: { timeoutMs: 12000, options: {} },
    });
    store.close();
  });

  it("creates nested folders and cascades deletes their requests", async () => {
    const store = new InvokeStore();
    const collection = await store.createCollection("Nested API");
    const auth = await store.createFolder(collection.id, "auth");
    const oauth = await store.createFolder(collection.id, "oauth", auth.id);
    await store.saveRequest(emptyRequest(), "Refresh token", collection.id, {
      folderId: oauth.id,
    });

    expect(await store.listFolders(collection.id)).toHaveLength(2);
    expect(await store.listRequests(collection.id)).toHaveLength(1);

    await store.deleteFolder(auth.id);

    expect(await store.listFolders(collection.id)).toEqual([]);
    expect(await store.listRequests(collection.id)).toEqual([]);
    store.close();
  });

  it("persists v1 flow definitions in IndexedDB", async () => {
    const store = new InvokeStore();
    const saved = await store.saveFlow({
      name: "Smoke flow",
      steps: [{ id: "delay", type: "delay", name: "Wait", delayMs: 1 }],
    });

    expect(saved.id).toBeTruthy();
    expect(await store.listFlows()).toHaveLength(1);

    await store.deleteFlow(saved.id);
    expect(await store.listFlows()).toEqual([]);
    store.close();
  });
});

describe("protocol defaults", () => {
  it("returns initial protocol defaults when the meta key is absent", async () => {
    const store = new InvokeStore();

    await expect(store.getDefaultProtocolOptions()).resolves.toEqual(
      INITIAL_PROTOCOL_DEFAULTS,
    );
    store.close();
  });

  it("merges stored protocol defaults over initial defaults", async () => {
    const store = new InvokeStore();
    await store.setMeta("defaultProtocolOptions", {
      rest: {
        options: {
          verifySsl: false,
        },
      },
    });

    const defaults = await store.getDefaultProtocolOptions();

    expect(defaults.rest).toEqual({
      options: {
        followRedirects: true,
        maxRedirects: 10,
        verifySsl: false,
        allowPrivateAddresses: true,
        tlsClientConfig: {},
      },
    });
    expect(defaults.websocket).toEqual(INITIAL_PROTOCOL_DEFAULTS.websocket);
    store.close();
  });

  it("keeps network settings out of empty request factories", () => {
    expect(emptyRequest().options).toEqual({});
    expect(emptyGraphQLRequest().options).toEqual({});
    expect(emptyWebSocketRequest().options).toEqual({});
    expect(emptyGrpcRequest().options).toEqual({});
  });

  it("merges protocol defaults at execution time with request options winning", () => {
    const merged = mergeWithDefaults(
      {
        verifySsl: false,
        tlsClientConfig: { serverName: "request.example.com" },
      },
      {
        options: {
          ...INITIAL_PROTOCOL_DEFAULTS.rest.options,
          connectTimeoutMs: 1000,
          tlsClientConfig: {
            caCertPem: "ca",
            serverName: "default.example.com",
          },
          proxy: { type: "http", url: "http://127.0.0.1:8080" },
        },
      },
    );

    expect(merged).toMatchObject({
      followRedirects: true,
      maxRedirects: 10,
      verifySsl: false,
      allowPrivateAddresses: true,
      connectTimeoutMs: 1000,
      proxy: { type: "http", url: "http://127.0.0.1:8080" },
      tlsClientConfig: {
        caCertPem: "ca",
        serverName: "request.example.com",
      },
    });
  });

  it("exports and imports workspace protocol defaults", async () => {
    const store = new InvokeStore();
    const defaults = {
      ...INITIAL_PROTOCOL_DEFAULTS,
      rest: {
        ...INITIAL_PROTOCOL_DEFAULTS.rest,
        options: {
          ...INITIAL_PROTOCOL_DEFAULTS.rest.options,
          verifySsl: false,
        },
      },
    };
    await store.setDefaultProtocolOptions(defaults);

    const exported = await store.exportWorkspace();
    const backup = serializeWorkspace(exported);
    const parsed = parseWorkspaceBackup(JSON.stringify(backup));

    expect(parsed.defaultProtocolOptions?.rest.options.verifySsl).toBe(false);
    store.close();

    await Dexie.delete("invoke-alpha");
    const imported = new InvokeStore();
    await imported.importWorkspace(parsed);

    const importedDefaults = await imported.getDefaultProtocolOptions();
    expect(importedDefaults.rest.options.verifySsl).toBe(false);
    imported.close();
  });

  it("accepts workspace backups without protocol defaults", () => {
    const parsed = parseWorkspaceBackup(
      JSON.stringify({
        version: "1.0",
        exportedAt: 1,
        collections: [],
        folders: [],
        requests: [],
        environments: [],
        flows: [],
      }),
    );

    expect(parsed.defaultProtocolOptions).toBeUndefined();
  });
});
