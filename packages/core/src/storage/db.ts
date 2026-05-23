import Dexie, { type Table } from "dexie";
import type {
  Collection,
  Environment,
  Flow,
  Folder,
  HistoryEntry,
  SavedRequest,
  StoredCookie,
} from "../types";
import { toRequestConfig } from "../request";
import { migrateNetworkOptionsToDefaults } from "./migrations";

export class InvokeDB extends Dexie {
  collections!: Table<Collection, string>;
  folders!: Table<Folder, string>;
  requests!: Table<SavedRequest, string>;
  environments!: Table<Environment, string>;
  history!: Table<HistoryEntry, string>;
  flows!: Table<Flow, string>;
  meta!: Table<{ key: string; value: unknown }, string>;
  cookies!: Table<StoredCookie, string>;

  constructor() {
    super("invoke-alpha");
    this.version(1).stores({
      collections: "id, name, updatedAt",
      requests: "id, collectionId, name, updatedAt",
      environments: "id, name, updatedAt",
      history: "id, createdAt",
      meta: "key",
    });
    this.version(2)
      .stores({
        collections: "id, name, updatedAt, sortOrder",
        folders: "id, collectionId, parentFolderId, name, updatedAt, sortOrder",
        requests:
          "id, collectionId, folderId, name, protocol, updatedAt, sortOrder",
        environments: "id, name, updatedAt",
        history: "id, createdAt, requestId, collectionId, protocol",
        flows: "id, name, updatedAt",
        meta: "key",
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
              options: stored.options,
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
      requests:
        "id, collectionId, folderId, name, protocol, updatedAt, sortOrder",
      environments: "id, name, updatedAt",
      history: "id, createdAt, requestId, collectionId, protocol",
      flows: "id, name, updatedAt",
      meta: "key",
    });

    this.version(4).stores({
      collections: "id, name, updatedAt, sortOrder",
      folders: "id, collectionId, parentFolderId, name, updatedAt, sortOrder",
      requests:
        "id, collectionId, folderId, name, protocol, updatedAt, sortOrder",
      environments: "id, name, updatedAt",
      history: "id, createdAt, requestId, collectionId, protocol, pinned",
      flows: "id, name, updatedAt",
      meta: "key",
    });

    this.version(5).stores({
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

    this.version(6)
      .stores({
        collections: "id, name, updatedAt, sortOrder",
        folders: "id, collectionId, parentFolderId, name, updatedAt, sortOrder",
        requests:
          "id, collectionId, folderId, name, protocol, updatedAt, sortOrder",
        environments: "id, name, updatedAt",
        history: "id, createdAt, requestId, collectionId, protocol, pinned",
        flows: "id, name, updatedAt",
        meta: "key",
        cookies: "id, domain, [domain+path+name], updatedAt",
      })
      .upgrade(migrateNetworkOptionsToDefaults);
  }
}

export const db = new InvokeDB();
