import type { StoredCookie } from "../types";
import { id } from "../request";

export function parseCookieHeaders(
  setCookieHeaders: string[],
  requestUrl: string,
): StoredCookie[] {
  let host = "";
  try {
    host = new URL(requestUrl).hostname;
  } catch {
    return [];
  }
  const now = Date.now();

  const results: StoredCookie[] = [];

  for (const header of setCookieHeaders) {
    const parts = header.split(";").map((p) => p.trim());
    const [nameVal, ...attrs] = parts;
    const eqIdx = nameVal.indexOf("=");
    const name = eqIdx >= 0 ? nameVal.slice(0, eqIdx).trim() : nameVal.trim();
    const value = eqIdx >= 0 ? nameVal.slice(eqIdx + 1).trim() : "";
    if (!name) continue;

    let domain = host;
    let path = "/";
    let secure = false;
    let httpOnly = false;
    let sameSite: StoredCookie["sameSite"];
    let expires: number | undefined;

    for (const attr of attrs) {
      const eqPos = attr.indexOf("=");
      const attrKey = (eqPos >= 0 ? attr.slice(0, eqPos) : attr)
        .trim()
        .toLowerCase();
      const attrVal = eqPos >= 0 ? attr.slice(eqPos + 1).trim() : "";

      if (attrKey === "domain" && attrVal) {
        domain = attrVal.startsWith(".") ? attrVal.slice(1) : attrVal;
      } else if (attrKey === "path" && attrVal) {
        path = attrVal;
      } else if (attrKey === "secure") {
        secure = true;
      } else if (attrKey === "httponly") {
        httpOnly = true;
      } else if (attrKey === "samesite" && attrVal) {
        const ss =
          attrVal.charAt(0).toUpperCase() + attrVal.slice(1).toLowerCase();
        if (ss === "Strict" || ss === "Lax" || ss === "None")
          sameSite = ss as StoredCookie["sameSite"];
      } else if (attrKey === "expires" && attrVal) {
        const d = new Date(attrVal).getTime();
        if (!isNaN(d)) expires = d;
      } else if (attrKey === "max-age" && attrVal) {
        const secs = parseInt(attrVal, 10);
        if (!isNaN(secs)) expires = secs > 0 ? now + secs * 1000 : 0;
      }
    }

    results.push({
      id: id(),
      domain,
      path,
      name,
      value,
      secure,
      httpOnly,
      sameSite,
      expires,
      createdAt: now,
      updatedAt: now,
    });
  }

  return results;
}

export function matchCookies(
  cookies: StoredCookie[],
  url: string,
): StoredCookie[] {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return [];
  }
  const host = urlObj.hostname;
  const path = urlObj.pathname;
  const isHttps = urlObj.protocol === "https:";
  const now = Date.now();

  return cookies.filter((c) => {
    if (c.expires !== undefined && c.expires < now) return false;
    if (c.secure && !isHttps) return false;
    if (host !== c.domain && !host.endsWith("." + c.domain)) return false;
    const cookiePath = c.path.endsWith("/") ? c.path : c.path + "/";
    const reqPath = path.endsWith("/") ? path : path + "/";
    if (!reqPath.startsWith(cookiePath)) return false;
    return true;
  });
}

export function buildCookieHeader(cookies: StoredCookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}
