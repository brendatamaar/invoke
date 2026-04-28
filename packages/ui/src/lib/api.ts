import type { ExecuteResponse, RequestConfig } from "@invoke/core";

export async function ping() {
  const response = await fetch("/api/ping");
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ message: string; version: string; uptimeMs: number }>;
}

export async function execute(request: RequestConfig): Promise<ExecuteResponse> {
  const response = await fetch("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.bodyMode === "none" ? "" : request.body,
      timeoutMs: request.timeoutMs,
      followRedirects: request.options?.followRedirects ?? true,
      maxRedirects: request.options?.maxRedirects ?? 10,
      verifySsl: request.options?.verifySsl ?? true,
      proxy: request.options?.proxy
    })
  });
  if (!response.ok) throw new Error(await response.text());
  const payload = (await response.json()) as ExecuteResponse;
  if (payload.bodyEncoding === "base64") {
    payload.body = decodeBase64Body(payload.body);
  }
  return payload;
}

function decodeBase64Body(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
