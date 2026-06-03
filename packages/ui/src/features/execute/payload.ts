import type { RequestConfig } from "@invoke/core";

const BODY_MODE_CONTENT_TYPES: Partial<Record<string, string>> = {
  json: "application/json",
  urlencoded: "application/x-www-form-urlencoded",
};

export function buildExecutePayload(request: RequestConfig) {
  // Deduplicate enabled headers — last value wins per key (case-insensitive)
  const seen = new Set<string>();
  const deduped = request.headers
    .filter((h) => h.enabled !== false && h.key)
    .reduceRight<typeof request.headers>((acc, h) => {
      const key = h.key.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        acc.unshift(h);
      }
      return acc;
    }, []);

  let headers = deduped;
  const autoContentType = BODY_MODE_CONTENT_TYPES[request.bodyMode];
  if (autoContentType && !headers.some((h) => h.key.toLowerCase() === "content-type")) {
    headers = [...headers, { key: "Content-Type", value: autoContentType, enabled: true }];
  }

  // If the user already set an Authorization (or api-key) header explicitly,
  // skip auth injection to avoid duplicates.
  const hasAuthHeader = headers.some((h) => h.key.toLowerCase() === "authorization");
  const auth =
    hasAuthHeader &&
    (request.auth.type === "bearer" ||
      request.auth.type === "oauth2" ||
      request.auth.type === "basic" ||
      (request.auth.type === "api-key" && request.auth.apiKeyIn === "header"))
      ? { type: "none" as const }
      : request.auth;

  return {
    method: request.method,
    url: request.url,
    headers,
    body: request.bodyMode === "none" ? "" : request.body,
    bodyMode: request.bodyMode,
    auth,
    timeoutMs: request.timeoutMs,
    connectTimeoutMs: request.options?.connectTimeoutMs,
    readTimeoutMs: request.options?.readTimeoutMs,
    followRedirects: request.options?.followRedirects ?? true,
    maxRedirects: request.options?.maxRedirects ?? 10,
    verifySsl: request.options?.verifySsl ?? true,
    httpVersion: request.options?.httpVersion ?? "auto",
    allowPrivateAddresses: request.options?.allowPrivateAddresses ?? true,
    proxy: request.options?.proxy,
    tlsClientConfig: request.options?.tlsClientConfig,
  };
}
