import type { KeyValue, RequestConfig } from "./types";

export function applyAuth(request: RequestConfig): RequestConfig {
  const headers = [...request.headers];
  const params = [...request.params];
  const auth = request.auth ?? { type: "none" };
  if (auth.type === "basic" && auth.username != null) {
    headers.push({
      key: "Authorization",
      value: `Basic ${btoa(`${auth.username}:${auth.password ?? ""}`)}`,
      enabled: true
    });
  }
  if (auth.type === "bearer" && auth.token) {
    headers.push({ key: "Authorization", value: `Bearer ${auth.token}`, enabled: true });
  }
  if (auth.type === "api-key" && auth.apiKeyName && auth.apiKeyValue) {
    const target = auth.apiKeyIn === "query" ? params : headers;
    target.push({ key: auth.apiKeyName, value: auth.apiKeyValue, enabled: true });
  }
  return { ...request, headers, params };
}

export function buildUrl(rawUrl: string, params: KeyValue[]) {
  const enabled = params.filter((param) => param.enabled !== false && param.key.trim());
  if (enabled.length === 0) return rawUrl;
  try {
    const url = new URL(rawUrl);
    enabled.forEach((param) => url.searchParams.append(param.key, param.value));
    return url.toString();
  } catch {
    const query = enabled.map((param) => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`).join("&");
    return rawUrl + (rawUrl.includes("?") ? "&" : "?") + query;
  }
}
