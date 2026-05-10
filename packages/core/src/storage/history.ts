import type { HistoryEntry, RequestDraft } from "../types";
import { searchHistory as filterHistory } from "../history";
import { clonePlain, id } from "../request";
import type { InvokeDB } from "./db";
import { HISTORY_LIMIT } from "./helpers";
import { getRetentionSettings } from "./meta";

export async function addHistory(
  db: InvokeDB,
  entry: Omit<HistoryEntry, "id" | "createdAt">,
) {
  const request = entry.request as RequestDraft;
  const saved: HistoryEntry = {
    ...clonePlain(entry),
    id: id(),
    requestId: entry.requestId ?? request.id,
    collectionId: entry.collectionId ?? request.collectionId,
    protocol: entry.protocol ?? request.protocol ?? "rest",
    createdAt: Date.now(),
  };
  await db.history.add(saved);
  await applyRetention(db);
  return saved;
}

export async function applyRetention(db: InvokeDB) {
  const settings = await getRetentionSettings(db);
  const maxEntries = settings?.maxEntries ?? HISTORY_LIMIT;
  const retentionDays = settings?.retentionDays ?? 0;

  if (retentionDays > 0) {
    const cutoff = Date.now() - retentionDays * 86400000;
    const staleByAge = await db.history
      .where("createdAt")
      .below(cutoff)
      .filter((e) => !e.pinned)
      .primaryKeys();
    if (staleByAge.length > 0)
      await db.history.bulkDelete(staleByAge as string[]);
  }

  const limit = maxEntries > 0 ? maxEntries : HISTORY_LIMIT;
  const count = await db.history.count();
  if (count > limit) {
    const stale = await db.history
      .orderBy("createdAt")
      .filter((e) => !e.pinned)
      .limit(count - limit)
      .primaryKeys();
    if (stale.length > 0) await db.history.bulkDelete(stale as string[]);
  }
}

export async function pinHistoryEntry(
  db: InvokeDB,
  id: string,
  pinned: boolean,
) {
  await db.history.where("id").equals(id).modify({ pinned });
}

export async function setHistoryEntryLabel(
  db: InvokeDB,
  id: string,
  label: string,
) {
  await db.history
    .where("id")
    .equals(id)
    .modify({ label: label || undefined });
}

export async function clearHistory(db: InvokeDB) {
  await db.history.filter((e) => !e.pinned).delete();
}

export async function deleteHistoryEntry(db: InvokeDB, id: string) {
  await db.history.delete(id);
}

export async function deleteHistoryEntries(db: InvokeDB, ids: string[]) {
  await db.history.bulkDelete(ids);
}

export function listHistory(db: InvokeDB, limit = 100) {
  return db.history.orderBy("createdAt").reverse().limit(limit).toArray();
}

export async function searchHistory(
  db: InvokeDB,
  query: string,
  limit = 100,
) {
  return filterHistory(await listHistory(db, HISTORY_LIMIT), query, limit);
}
