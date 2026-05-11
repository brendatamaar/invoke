import type { ExecuteResponse, RequestConfig } from "@invoke/core";
import { decodeBase64, ensureOk } from "../../lib/http";

export async function execute(
  request: RequestConfig,
  signal?: AbortSignal,
): Promise<ExecuteResponse> {
  const response = await fetch("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildExecutePayload(request)),
    signal,
  });
  await ensureOk(response);
  const payload = (await response.json()) as ExecuteResponse;
  if (payload.bodyEncoding === "base64")
    payload.body = decodeBase64(payload.body);
  return payload;
}

export async function executeWithRetry(
  request: RequestConfig,
  signal?: AbortSignal,
): Promise<ExecuteResponse & { retryAttempts?: number }> {
  const policy = request.retryPolicy;
  if (!policy || policy.maxRetries <= 0) return execute(request, signal);

  let lastResult: ExecuteResponse | undefined;
  let attempts = 0;
  let backoff = policy.backoffMs;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const res = await execute(request, signal);
      const shouldRetry =
        (policy.retryOn5xx && res.status >= 500) ||
        (policy.retryOnTimeout &&
          !!res.error?.toLowerCase().includes("timeout"));
      if (!shouldRetry || attempt === policy.maxRetries) {
        return { ...res, retryAttempts: attempt };
      }
      lastResult = res;
      attempts = attempt + 1;
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      const isTimeout =
        policy.retryOnTimeout && String(e).toLowerCase().includes("timeout");
      if (!isTimeout || attempt === policy.maxRetries) throw e;
      attempts = attempt + 1;
    }
    await new Promise((resolve) => setTimeout(resolve, backoff));
    backoff *= 2;
  }
  return { ...lastResult!, retryAttempts: attempts };
}

export async function executeStream(
  request: RequestConfig,
  handlers: {
    onChunk: (chunk: string) => void;
    onFinal: (response: ExecuteResponse) => void | Promise<void>;
    signal?: AbortSignal;
  },
) {
  const response = await fetch("/api/execute/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildExecutePayload(request)),
    signal: handlers.signal,
  });
  if (!response.ok || !response.body) throw new Error(await response.text());

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;
  while (!done) {
    const { value, done: streamDone } = await reader.read();
    done = streamDone;
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) await handleSseEvent(event, handlers);
  }
  if (buffer.trim()) await handleSseEvent(buffer, handlers);
}

const BODY_MODE_CONTENT_TYPES: Partial<Record<string, string>> = {
  json: "application/json",
  urlencoded: "application/x-www-form-urlencoded",
};

function buildExecutePayload(req: RequestConfig) {
  let headers = req.headers;
  const autoContentType = BODY_MODE_CONTENT_TYPES[req.bodyMode];
  if (
    autoContentType &&
    !headers.some(
      (h) => h.enabled !== false && h.key.toLowerCase() === "content-type",
    )
  ) {
    headers = [
      ...headers,
      { key: "Content-Type", value: autoContentType, enabled: true },
    ];
  }

  return {
    method: req.method,
    url: req.url,
    headers,
    body: req.bodyMode === "none" ? "" : req.body,
    bodyMode: req.bodyMode,
    auth: req.auth,
    timeoutMs: req.timeoutMs,
    followRedirects: req.options?.followRedirects ?? true,
    maxRedirects: req.options?.maxRedirects ?? 10,
    verifySsl: req.options?.verifySsl ?? true,
    proxy: req.options?.proxy,
    tlsClientConfig: req.options?.tlsClientConfig,
  };
}

async function handleSseEvent(
  rawEvent: string,
  handlers: {
    onChunk: (chunk: string) => void;
    onFinal: (response: ExecuteResponse) => void | Promise<void>;
  },
) {
  const ev = rawEvent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .reduce<{ event?: string; data: string[] }>(
      (acc, line) => {
        if (line.startsWith("event:")) acc.event = line.slice(6).trim();
        if (line.startsWith("data:")) acc.data.push(line.slice(5).trimStart());
        return acc;
      },
      { data: [] },
    );
  const data = ev.data.join("\n");
  if (ev.event === "chunk") {
    try {
      const parsed = JSON.parse(data) as { chunk?: string; encoding?: string };
      const rawChunk = parsed.chunk ?? "";
      const chunk =
        parsed.encoding === "base64" ? atob(rawChunk) : rawChunk;
      handlers.onChunk(chunk);
    } catch {
      handlers.onChunk(data);
    }
    return;
  }
  if (ev.event === "final") {
    const payload = JSON.parse(data) as ExecuteResponse;
    if (payload.bodyEncoding === "base64")
      payload.body = decodeBase64(payload.body);
    await handlers.onFinal(payload);
  }
}
