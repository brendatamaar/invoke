import Dexie, { type Table } from "dexie";
import type { Collection, Environment, HistoryEntry, RequestConfig, SavedRequest } from "./types";
import { clonePlain, id } from "./request";

class InvokeDB extends Dexie {
  collections!: Table<Collection, string>;
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
  }
}

export class InvokeStore {
  private db = new InvokeDB();

  async listCollections() {
    return this.db.collections.orderBy("updatedAt").reverse().toArray();
  }

  async createCollection(name: string) {
    const now = Date.now();
    const collection: Collection = { id: id(), name, createdAt: now, updatedAt: now };
    await this.db.collections.add(collection);
    return collection;
  }

  async updateCollection(collection: Collection) {
    const updated = { ...collection, updatedAt: Date.now() };
    await this.db.collections.put(updated);
    return updated;
  }

  async deleteCollection(collectionId: string) {
    await this.db.transaction("rw", this.db.collections, this.db.requests, async () => {
      await this.db.requests.where("collectionId").equals(collectionId).delete();
      await this.db.collections.delete(collectionId);
    });
  }

  async listRequests(collectionId?: string) {
    if (collectionId) return this.db.requests.where("collectionId").equals(collectionId).toArray();
    return this.db.requests.orderBy("updatedAt").reverse().toArray();
  }

  async saveRequest(request: RequestConfig, name: string, collectionId: string) {
    const now = Date.now();
    const saved: SavedRequest = {
      ...clonePlain(request),
      id: request.id ?? id(),
      collectionId,
      name,
      createdAt: (request as SavedRequest).createdAt ?? now,
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
    const saved: HistoryEntry = { ...clonePlain(entry), id: id(), createdAt: Date.now() };
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
