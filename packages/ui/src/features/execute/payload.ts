import type { RequestConfig } from "@invoke/core";

const BODY_MODE_CONTENT_TYPES: Partial<Record<string, string>> = {
  json: "application/json",
  urlencoded: "application/x-www-form-urlencoded",
};

export function buildExecutePayload(request: RequestConfig) {
  let headers = request.headers;
  const autoContentType = BODY_MODE_CONTENT_TYPES[request.bodyMode];
  if (
    autoContentType &&
    !headers.some(
      (header) => header.enabled !== false && header.key.toLowerCase() === "content-type",
    )
  ) {
    headers = [...headers, { key: "Content-Type", value: autoContentType, enabled: true }];
  }

  return {
    method: request.method,
    url: request.url,
    headers,
    body: request.bodyMode === "none" ? "" : request.body,
    bodyMode: request.bodyMode,
    auth: request.auth,
    timeoutMs: request.timeoutMs,
    connectTimeoutMs: request.options?.connectTimeoutMs,
    readTimeoutMs: request.options?.readTimeoutMs,
    followRedirects: request.options?.followRedirects ?? true,
    maxRedirects: request.options?.maxRedirects ?? 10,
    verifySsl: request.options?.verifySsl ?? true,
    allowPrivateAddresses: request.options?.allowPrivateAddresses ?? true,
    proxy: request.options?.proxy,
    tlsClientConfig: request.options?.tlsClientConfig,
  };
}
