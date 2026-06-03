import {
  buildCookieHeader,
  matchCookies,
  parseCookieHeaders,
  type RequestConfig,
  type StoredCookie,
} from "@invoke/core";
import { coreStore } from "../../store";

export function injectCookies(request: RequestConfig, cookies: StoredCookie[]): RequestConfig {
  const matched = matchCookies(cookies, request.url);
  if (matched.length === 0) return request;

  const cookieHeader = buildCookieHeader(matched);
  const existing = request.headers.find((header) => header.key.toLowerCase() === "cookie");

  if (existing) {
    return {
      ...request,
      headers: request.headers.map((header) =>
        header.key.toLowerCase() === "cookie"
          ? {
              ...header,
              value: header.value ? `${header.value}; ${cookieHeader}` : cookieHeader,
            }
          : header,
      ),
    };
  }

  return {
    ...request,
    headers: [...request.headers, { key: "Cookie", value: cookieHeader, enabled: true }],
  };
}

export async function persistResponseCookies(
  response: { headers: { key: string; value: string }[] },
  url: string,
) {
  const setCookieHeaders = response.headers.flatMap((header) =>
    header.key.toLowerCase() === "set-cookie" ? [header.value] : [],
  );
  if (setCookieHeaders.length === 0) return undefined;

  const parsed = parseCookieHeaders(setCookieHeaders, url);
  await coreStore.upsertCookies(parsed);
  return coreStore.listCookies();
}
