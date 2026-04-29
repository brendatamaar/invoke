import Dexie, { type Table } from "dexie";
import type {
  CachedGraphQLSchema,
  Collection,
  Environment,
  Flow,
  Folder,
  HistoryEntry,
  ProtocolRequestConfig,
  RequestConfig,
  RequestDraft,
  RequestProtocol,
  SavedRequest
} from "./types";
import { searchHistory as filterHistory } from "./history";
import { clonePlain, id, inferProtocol, isGraphQLRequestConfig, isGrpcRequestConfig, isWebSocketRequestConfig, toRequestConfig } from "./request";

const HISTORY_LIMIT = 10000;

class InvokeDB extends Dexie {
  collections!: Table<Collection, string>;
  folders!: Table<Folder, string>;
  requests!: Table<SavedRequest, string>;
  environments!: Table<Environment, string>;
  history!: Table<HistoryEntry, string>;
  flows!: Table<Flow, string>;
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
        flows: "id, name, updatedAt",
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

    this.version(3).stores({
      collections: "id, name, updatedAt, sortOrder",
      folders: "id, collectionId, parentFolderId, name, updatedAt, sortOrder",
      requests: "id, collectionId, folderId, name, protocol, updatedAt, sortOrder",
      environments: "id, name, updatedAt",
      history: "id, createdAt, requestId, collectionId, protocol",
      flows: "id, name, updatedAt",
      meta: "key"
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

  async createFolder(collectionId: string, name: string, parentFolderId: string | null = null, data: Partial<Folder> = {}) {
    const now = Date.now();
    const folder: Folder = {
      ...data,
      id: data.id ?? id(),
      collectionId,
      parentFolderId,
      name,
      variables: data.variables ?? [],
      sortOrder: data.sortOrder ?? now,
      createdAt: data.createdAt ?? now,
      updatedAt: now
    };
    await this.db.folders.add(folder);
    return folder;
  }

  async updateFolder(folder: Folder) {
    const updated: Folder = {
      ...folder,
      parentFolderId: folder.parentFolderId ?? null,
      variables: folder.variables ?? [],
      updatedAt: Date.now()
    };
    await this.db.folders.put(clonePlain(updated));
    return updated;
  }

  async deleteFolder(folderId: string) {
    await this.db.transaction("rw", this.db.folders, this.db.requests, async () => {
      const allFolders = await this.db.folders.toArray();
      const ids = collectFolderIds(allFolders, folderId);
      await this.db.requests.where("folderId").anyOf(ids).delete();
      await this.db.folders.bulkDelete(ids);
    });
  }

  async moveRequest(requestId: string, folderId: string | null) {
    const request = await this.db.requests.get(requestId);
    if (!request) return undefined;
    const updated = { ...request, folderId, updatedAt: Date.now() };
    await this.db.requests.put(clonePlain(updated));
    return updated;
  }

  async saveRequest(
    request: ProtocolRequestConfig | RequestDraft,
    name: string,
    collectionId: string,
    options: { id?: string; folderId?: string | null; protocol?: RequestProtocol; sortOrder?: number; createdAt?: number } = {}
  ) {
    const now = Date.now();
    const draft = request as RequestDraft;
    const protocol = options.protocol ?? inferProtocol(request, draft.protocol ?? "rest");
    const saved: SavedRequest = {
      id: options.id ?? draft.id ?? id(),
      collectionId,
      folderId: options.folderId ?? draft.folderId ?? null,
      name,
      protocol,
      request: clonePlain(normalizeSavedRequest(request)),
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

  async getMeta<T>(key: string): Promise<T | undefined> {
    return (await this.db.meta.get(key))?.value as T | undefined;
  }

  async setMeta(key: string, value: unknown) {
    await this.db.meta.put({ key, value: clonePlain(value) });
  }

  async getGraphQLSchema(endpoint: string) {
    return this.getMeta<CachedGraphQLSchema>(schemaCacheKey(endpoint));
  }

  async saveGraphQLSchema(schema: CachedGraphQLSchema) {
    await this.setMeta(schemaCacheKey(schema.endpoint), schema);
    return schema;
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
    if (count > HISTORY_LIMIT) {
      const stale = await this.db.history.orderBy("createdAt").limit(count - HISTORY_LIMIT).primaryKeys();
      await this.db.history.bulkDelete(stale as string[]);
    }
    return saved;
  }

  async listHistory(limit = 100) {
    return this.db.history.orderBy("createdAt").reverse().limit(limit).toArray();
  }

  async searchHistory(query: string, limit = 100) {
    return filterHistory(await this.listHistory(HISTORY_LIMIT), query, limit);
  }

  async listFlows() {
    return this.db.flows.orderBy("updatedAt").reverse().toArray();
  }

  async saveFlow(flow: Partial<Flow> & Pick<Flow, "name" | "steps">) {
    const now = Date.now();
    const saved: Flow = {
      id: flow.id ?? id(),
      name: flow.name,
      steps: clonePlain(flow.steps),
      createdAt: flow.createdAt ?? now,
      updatedAt: now
    };
    await this.db.flows.put(saved);
    return saved;
  }

  async deleteFlow(flowId: string) {
    await this.db.flows.delete(flowId);
  }
}

function schemaCacheKey(endpoint: string) {
  return `graphql-schema:${endpoint.trim()}`;
}

function collectFolderIds(folders: Folder[], rootId: string) {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (folder.parentFolderId && ids.has(folder.parentFolderId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        changed = true;
      }
    }
  }
  return [...ids];
}

function normalizeSavedRequest(request: ProtocolRequestConfig | RequestDraft): ProtocolRequestConfig {
  if (isGraphQLRequestConfig(request) || isWebSocketRequestConfig(request) || isGrpcRequestConfig(request)) {
    return request as ProtocolRequestConfig;
  }
  return toRequestConfig(request as RequestConfig | RequestDraft);
}
