import type { ExecuteResponse, KeyValue, RequestConfig } from "@invoke/core";

export async function browserFetch(
  request: RequestConfig,
  signal?: AbortSignal,
): Promise<ExecuteResponse> {
  const headers = buildHeaders(request);
  const url = buildUrl(request.url, request.params, request.auth);
  const body = buildBody(request, headers);

  const startMs = performance.now();
  let fetchResponse: Response;
  try {
    fetchResponse = await fetch(url, {
      method: request.method,
      headers,
      body,
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    const totalMs = performance.now() - startMs;
    return errorResponse(totalMs, (err as Error).message);
  }

  const ttfbMs = performance.now() - startMs;
  const responseText = await fetchResponse.text();
  const totalMs = performance.now() - startMs;

  const responseHeaders: KeyValue[] = [];
  fetchResponse.headers.forEach((value, key) => {
    responseHeaders.push({ key, value });
  });

  return {
    status: fetchResponse.status,
    statusText: fetchResponse.statusText,
    headers: responseHeaders,
    body: responseText,
    timing: {
      dnsMs: 0,
      tcpMs: 0,
      tlsMs: 0,
      ttfbMs,
      transferMs: totalMs - ttfbMs,
      totalMs,
    },
    requestSize: 0,
    responseSize: new TextEncoder().encode(responseText).length,
  };
}

function buildUrl(
  rawUrl: string,
  params: RequestConfig["params"],
  auth: RequestConfig["auth"],
): string {
  const active = params.filter((p) => p.enabled !== false && p.key).map((p) => ({ ...p }));
  if (auth.type === "api-key" && auth.apiKeyIn === "query" && auth.apiKeyName) {
    active.push({ key: auth.apiKeyName, value: auth.apiKeyValue ?? "" });
  }
  if (active.length === 0) return rawUrl;
  const qs = active
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
  return `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}${qs}`;
}

function buildHeaders(request: RequestConfig): Headers {
  // Deduplicate — last enabled value wins per key (case-insensitive)
  const seen = new Set<string>();
  const deduped = [...request.headers]
    .reverse()
    .filter((h) => {
      if (h.enabled === false || !h.key) return false;
      const key = h.key.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .reverse();

  const headers = new Headers();
  for (const h of deduped) headers.set(h.key, h.value);

  // Only inject auth if the user hasn't already set an Authorization header
  if (!headers.has("authorization")) {
    const { auth } = request;
    if ((auth.type === "bearer" || auth.type === "oauth2") && auth.token) {
      headers.set("Authorization", `Bearer ${auth.token}`);
    } else if (auth.type === "basic" && auth.username) {
      headers.set("Authorization", `Basic ${btoa(`${auth.username}:${auth.password ?? ""}`)}`);
    } else if (auth.type === "api-key" && auth.apiKeyIn === "header" && auth.apiKeyName) {
      headers.set(auth.apiKeyName, auth.apiKeyValue ?? "");
    }
  }
  return headers;
}

function buildBody(request: RequestConfig, headers: Headers): BodyInit | undefined {
  if (request.bodyMode === "none" || request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }
  if (request.bodyMode === "json" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  } else if (request.bodyMode === "urlencoded" && !headers.has("content-type")) {
    headers.set("content-type", "application/x-www-form-urlencoded");
  }
  return request.body || undefined;
}

function errorResponse(totalMs: number, error: string): ExecuteResponse {
  return {
    status: 0,
    statusText: "",
    headers: [],
    body: "",
    timing: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 0, transferMs: 0, totalMs },
    requestSize: 0,
    responseSize: 0,
    error,
  };
}
