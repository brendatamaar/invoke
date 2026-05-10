import type { StoredCookie } from "../types";
import type { InvokeDB } from "./db";

export function listCookies(db: InvokeDB): Promise<StoredCookie[]> {
  return db.cookies.orderBy("domain").toArray();
}

export async function upsertCookie(
  db: InvokeDB,
  cookie: StoredCookie,
): Promise<void> {
  const existing = await db.cookies
    .where("[domain+path+name]")
    .equals([cookie.domain, cookie.path, cookie.name])
    .first();
  if (existing) {
    await db.cookies.put({
      ...cookie,
      id: existing.id,
      createdAt: existing.createdAt,
    });
  } else {
    await db.cookies.put(cookie);
  }
}

export async function upsertCookies(
  db: InvokeDB,
  cookies: StoredCookie[],
): Promise<void> {
  await Promise.all(cookies.map((c) => upsertCookie(db, c)));
}

export async function updateCookie(
  db: InvokeDB,
  cookie: StoredCookie,
): Promise<void> {
  await db.cookies.put({ ...cookie, updatedAt: Date.now() });
}

export async function deleteCookie(
  db: InvokeDB,
  cookieId: string,
): Promise<void> {
  await db.cookies.delete(cookieId);
}

export async function clearCookies(
  db: InvokeDB,
  domain?: string,
): Promise<void> {
  if (domain) {
    await db.cookies.where("domain").equals(domain).delete();
  } else {
    await db.cookies.clear();
  }
}
