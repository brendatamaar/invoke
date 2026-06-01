import type { StoredCookie } from "../types";
import type { InvokeDB } from "./db";

export function listCookies(db: InvokeDB): Promise<StoredCookie[]> {
  return db.cookies.orderBy("domain").toArray();
}

export async function upsertCookie(db: InvokeDB, cookie: StoredCookie): Promise<void> {
  await db.transaction("rw", db.cookies, async () => {
    const all = await db.cookies
      .where("[domain+path+name]")
      .equals([cookie.domain, cookie.path, cookie.name])
      .toArray();
    if (all.length > 1) {
      const [keep, ...dupes] = all;
      await Promise.all(dupes.map((d) => db.cookies.delete(d.id)));
      await db.cookies.put({ ...cookie, id: keep.id, createdAt: keep.createdAt });
    } else if (all.length === 1) {
      await db.cookies.put({ ...cookie, id: all[0].id, createdAt: all[0].createdAt });
    } else {
      await db.cookies.put(cookie);
    }
  });
}

export async function upsertCookies(db: InvokeDB, cookies: StoredCookie[]): Promise<void> {
  for (const c of cookies) await upsertCookie(db, c);
}

export async function updateCookie(db: InvokeDB, cookie: StoredCookie): Promise<void> {
  await db.cookies.put({ ...cookie, updatedAt: Date.now() });
}

export async function deleteCookie(db: InvokeDB, cookieId: string): Promise<void> {
  await db.cookies.delete(cookieId);
}

export async function clearCookies(db: InvokeDB, domain?: string): Promise<void> {
  if (domain) {
    await db.cookies.where("domain").equals(domain).delete();
  } else {
    await db.cookies.clear();
  }
}
