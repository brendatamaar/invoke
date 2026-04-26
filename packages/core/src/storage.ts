import Dexie, { type Table } from "dexie";
import type {
  Collection,
  Environment,
  Folder,
  HistoryEntry,
  RequestConfig,
  RequestDraft,
  RequestProtocol,
  SavedRequest
} from "./types";
import { clonePlain, id, toRequestConfig } from "./request";

class InvokeDB extends Dexie {
  collections!: Table<Collection, string>;
  folders!: Table<Folder, string>;
  requests!: Table<SavedRequest, string>;
  environments!: Table<Environment, string>;
  history!: Table<HistoryEntry, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super("invoke-alpha");
    this.version(1).stores({
      collections: "id, name, updatedAt",
      requests: "id, collectionId, name, updatedAt",
      environments: "id, name, updatedAt",
      history: "id, createdAt",
      meta: "key"
    });
    this.version(2)
      .stores({
        collections: "id, name, updatedAt, sortOrder",
        folders: "id, collectionId, parentFolderId, name, updatedAt, sortOrder",
        requests: "id, collectionId, folderId, name, protocol, updatedAt, sortOrder",
        environments: "id, name, updatedAt",
        history: "id, createdAt, requestId, collectionId, protocol",
        meta: "key"
      })
      .upgrade(async (tx) => {
        await tx
          .table("collections")
          .toCollection()
          .modify((collection: Partial<Collection>) => {
            collection.variables ??= [];
            collection.sortOrder ??= collection.createdAt ?? Date.now();
          });

        await tx
          .table("requests")
          .toCollection()
          .modify((stored: any) => {
            if (stored.request) {
              stored.protocol ??= "rest";
              stored.folderId ??= null;
              stored.sortOrder ??= stored.createdAt ?? Date.now();
              return;
            }

            const request = toRequestConfig({
              method: stored.method ?? "GET",
              url: stored.url ?? "",
              params: stored.params ?? [],
              headers: stored.headers ?? [],
              bodyMode: stored.bodyMode ?? "none",
              body: stored.body ?? "",
              auth: stored.auth ?? { type: "none" },
              timeoutMs: stored.timeoutMs ?? 30000,
              variables: stored.variables ?? [],
              options: stored.options
            });

            stored.protocol = "rest";
            stored.folderId = null;
            stored.sortOrder = stored.createdAt ?? Date.now();
            stored.request = request;

            delete stored.method;
            delete stored.url;
            delete stored.params;
            delete stored.headers;
            delete stored.bodyMode;
            delete stored.body;
            delete stored.auth;
            delete stored.timeoutMs;
            delete stored.variables;
            delete stored.options;
          });

        await tx
          .table("history")
          .toCollection()
          .modify((entry: Partial<HistoryEntry>) => {
            entry.protocol ??= "rest";
          });
      });
  }
}

export class InvokeStore {
  private db = new InvokeDB();

  close() {
    this.db.close();
  }

  async listCollections() {
    return this.db.collections.orderBy("updatedAt").reverse().toArray();
  }

  async createCollection(name: string, data: Partial<Collection> = {}) {
    const now = Date.now();
    const collection: Collection = {
      ...data,
      id: id(),
      name,
      variables: data.variables ?? [],
      sortOrder: data.sortOrder ?? now,
      createdAt: now,
      updatedAt: now
    };
    await this.db.collections.add(collection);
    return collection;
  }

  async updateCollection(collection: Collection) {
    const updated = { ...collection, variables: collection.variables ?? [], updatedAt: Date.now() };
    await this.db.collections.put(updated);
    return updated;
  }

  async deleteCollection(collectionId: string) {
    await this.db.transaction("rw", this.db.collections, this.db.folders, this.db.requests, async () => {
      await this.db.folders.where("collectionId").equals(collectionId).delete();
      await this.db.requests.where("collectionId").equals(collectionId).delete();
      await this.db.collections.delete(collectionId);
    });
  }

  async listRequests(collectionId?: string) {
    if (collectionId) return this.db.requests.where("collectionId").equals(collectionId).toArray();
    return this.db.requests.orderBy("updatedAt").reverse().toArray();
  }

  async listFolders(collectionId?: string) {
    if (collectionId) return this.db.folders.where("collectionId").equals(collectionId).toArray();
    return this.db.folders.orderBy("sortOrder").toArray();
  }

  async createFolder(collectionId: string, name: string, parentFolderId: string | null = null) {
    const now = Date.now();
    const folder: Folder = {
      id: id(),
      collectionId,
      parentFolderId,
      name,
      variables: [],
      sortOrder: now,
      createdAt: now,
      updatedAt: now
    };
    await this.db.folders.add(folder);
    return folder;
  }

  async saveRequest(
    request: RequestConfig | RequestDraft,
    name: string,
    collectionId: string,
    options: { id?: string; folderId?: string | null; protocol?: RequestProtocol; sortOrder?: number; createdAt?: number } = {}
  ) {
    const now = Date.now();
    const draft = request as RequestDraft;
    const saved: SavedRequest = {
      id: options.id ?? draft.id ?? id(),
      collectionId,
      folderId: options.folderId ?? draft.folderId ?? null,
      name,
      protocol: options.protocol ?? draft.protocol ?? "rest",
      request: clonePlain(toRequestConfig(request)),
      sortOrder: options.sortOrder ?? draft.sortOrder ?? now,
      createdAt: options.createdAt ?? (request as Partial<SavedRequest>).createdAt ?? now,
      updatedAt: now
    };
    await this.db.requests.put(clonePlain(saved));
    return saved;
  }

  async deleteRequest(requestId: string) {
    await this.db.requests.delete(requestId);
  }

  async listEnvironments() {
    return this.db.environments.orderBy("updatedAt").reverse().toArray();
  }

  async saveEnvironment(environment: Partial<Environment> & Pick<Environment, "name" | "variables">) {
    const now = Date.now();
    const saved: Environment = {
      id: environment.id || id(),
      name: environment.name,
      variables: environment.variables,
      createdAt: environment.createdAt ?? now,
      updatedAt: now
    };
    await this.db.environments.put(clonePlain(saved));
    return saved;
  }

  async deleteEnvironment(environmentId: string) {
    await this.db.environments.delete(environmentId);
    const active = await this.getActiveEnvironmentId();
    if (active === environmentId) await this.setActiveEnvironmentId(undefined);
  }

  async getActiveEnvironmentId() {
    return (await this.db.meta.get("activeEnvironment"))?.value as string | undefined;
  }

  async setActiveEnvironmentId(environmentId?: string) {
    await this.db.meta.put({ key: "activeEnvironment", value: environmentId });
  }

  async addHistory(entry: Omit<HistoryEntry, "id" | "createdAt">) {
    const request = entry.request as RequestDraft;
    const saved: HistoryEntry = {
      ...clonePlain(entry),
      id: id(),
      requestId: entry.requestId ?? request.id,
      collectionId: entry.collectionId ?? request.collectionId,
      protocol: entry.protocol ?? request.protocol ?? "rest",
      createdAt: Date.now()
    };
    await this.db.history.add(saved);
    const count = await this.db.history.count();
    if (count > 1000) {
      const stale = await this.db.history.orderBy("createdAt").limit(count - 1000).primaryKeys();
      await this.db.history.bulkDelete(stale as string[]);
    }
    return saved;
  }

  async listHistory(limit = 100) {
    return this.db.history.orderBy("createdAt").reverse().limit(limit).toArray();
  }
}
