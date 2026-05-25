import type { StoredCookie } from "@invoke/core";

export function groupByDomain(cookies: StoredCookie[]) {
  const map = new Map<string, StoredCookie[]>();
  for (const cookie of cookies) {
    const list = map.get(cookie.domain) ?? [];
    list.push(cookie);
    map.set(cookie.domain, list);
  }
  return map;
}
