import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emptyRequest, InvokeStore } from "./index";

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
