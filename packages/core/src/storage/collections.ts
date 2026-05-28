import type {
  Collection,
  Folder,
  ProtocolRequestConfig,
  RequestDraft,
  RequestProtocol,
  SavedRequest,
} from "../types";
import { clonePlain, id, inferProtocol } from "../request";
import type { InvokeDB } from "./db";
import { collectFolderIds, normalizeSavedRequest } from "./helpers";

export function listCollections(db: InvokeDB) {
  return db.collections.orderBy("updatedAt").reverse().toArray();
}

export async function createCollection(db: InvokeDB, name: string, data: Partial<Collection> = {}) {
  const now = Date.now();
  const collection: Collection = {
    ...data,
    id: id(),
    name,
    variables: data.variables ?? [],
    sortOrder: data.sortOrder ?? now,
    createdAt: now,
    updatedAt: now,
  };
  await db.collections.add(collection);
  return collection;
}

export async function updateCollection(db: InvokeDB, collection: Collection) {
  const updated = {
    ...collection,
    variables: collection.variables ?? [],
    updatedAt: Date.now(),
  };
  await db.collections.put(updated);
  return updated;
}

export async function deleteCollection(db: InvokeDB, collectionId: string) {
  await db.transaction("rw", db.collections, db.folders, db.requests, async () => {
    await db.folders.where("collectionId").equals(collectionId).delete();
    await db.requests.where("collectionId").equals(collectionId).delete();
    await db.collections.delete(collectionId);
  });
}

export function listRequests(db: InvokeDB, collectionId?: string) {
  if (collectionId)
    return db.requests.where("collectionId").equals(collectionId).sortBy("sortOrder");
  return db.requests.orderBy("updatedAt").reverse().toArray();
}

export async function reorderRequests(db: InvokeDB, ids: string[]) {
  const now = Date.now();
  await db.transaction("rw", db.requests, async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.requests.where("id").equals(ids[i]).modify({ sortOrder: i, updatedAt: now });
    }
  });
}

export function listFolders(db: InvokeDB, collectionId?: string) {
  if (collectionId) return db.folders.where("collectionId").equals(collectionId).toArray();
  return db.folders.orderBy("sortOrder").toArray();
}

export async function createFolder(
  db: InvokeDB,
  collectionId: string,
  name: string,
  parentFolderId: string | null = null,
  data: Partial<Folder> = {},
) {
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
    updatedAt: now,
  };
  await db.folders.add(folder);
  return folder;
}

export async function updateFolder(db: InvokeDB, folder: Folder) {
  const updated: Folder = {
    ...folder,
    parentFolderId: folder.parentFolderId ?? null,
    variables: folder.variables ?? [],
    updatedAt: Date.now(),
  };
  await db.folders.put(clonePlain(updated));
  return updated;
}

export async function deleteFolder(db: InvokeDB, folderId: string) {
  await db.transaction("rw", db.folders, db.requests, async () => {
    const allFolders = await db.folders.toArray();
    const ids = collectFolderIds(allFolders, folderId);
    await db.requests.where("folderId").anyOf(ids).delete();
    await db.folders.bulkDelete(ids);
  });
}

export async function moveRequest(db: InvokeDB, requestId: string, folderId: string | null) {
  const request = await db.requests.get(requestId);
  if (!request) return undefined;
  const updated = { ...request, folderId, updatedAt: Date.now() };
  await db.requests.put(clonePlain(updated));
  return updated;
}

export async function saveRequest(
  db: InvokeDB,
  request: ProtocolRequestConfig | RequestDraft,
  name: string,
  collectionId: string,
  options: {
    id?: string;
    folderId?: string | null;
    protocol?: RequestProtocol;
    sortOrder?: number;
    createdAt?: number;
  } = {},
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
    updatedAt: now,
  };
  await db.requests.put(clonePlain(saved));
  return saved;
}

export async function deleteRequest(db: InvokeDB, requestId: string) {
  await db.requests.delete(requestId);
}
