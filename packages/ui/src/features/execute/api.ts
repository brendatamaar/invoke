import type { ExecuteResponse, RequestConfig } from "@invoke/core";
import { decodeBase64, ensureOk } from "../../lib/http";
import { applyProtocolDefaults } from "../../lib/protocolDefaults";
import { buildExecutePayload } from "./payload";

export async function execute(
  request: RequestConfig,
  signal?: AbortSignal,
): Promise<ExecuteResponse> {
  const merged = applyProtocolDefaults(request);
  const response = await fetch("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildExecutePayload(merged)),
    signal,
  });
  await ensureOk(response);
  const payload = (await response.json()) as ExecuteResponse;
  if (payload.bodyEncoding === "base64") {
    payload.body = decodeBase64(payload.body);
  }
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
      const response = await execute(request, signal);
      const shouldRetry =
        (policy.retryOn5xx && response.status >= 500) ||
        (policy.retryOnTimeout && !!response.error?.toLowerCase().includes("timeout"));
      if (!shouldRetry || attempt === policy.maxRetries) {
        return { ...response, retryAttempts: attempt };
      }
      lastResult = response;
      attempts = attempt + 1;
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      const isTimeout = policy.retryOnTimeout && String(error).toLowerCase().includes("timeout");
      if (!isTimeout || attempt === policy.maxRetries) throw error;
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
  const merged = applyProtocolDefaults(request);
  const response = await fetch("/api/execute/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildExecutePayload(merged)),
    signal: handlers.signal,
  });
  if (!response.ok || !response.body) throw new Error(await response.text());

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;
  // Sequential stream reading — Promise.all is not applicable for streaming I/O
  // eslint-disable-next-line react-doctor/async-await-in-loop
  while (!done) {
    const { value, done: streamDone } = await reader.read(); // eslint-disable-line react-doctor/async-await-in-loop
    done = streamDone;
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    await events.reduce((p, event) => p.then(() => handleSseEvent(event, handlers)), Promise.resolve());
  }
  if (buffer.trim()) await handleSseEvent(buffer, handlers);
}

async function handleSseEvent(
  rawEvent: string,
  handlers: {
    onChunk: (chunk: string) => void;
    onFinal: (response: ExecuteResponse) => void | Promise<void>;
  },
) {
  const event = rawEvent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .reduce<{ event?: string; data: string[] }>(
      (accumulator, line) => {
        if (line.startsWith("event:")) {
          accumulator.event = line.slice(6).trim();
        }
        if (line.startsWith("data:")) {
          accumulator.data.push(line.slice(5).trimStart());
        }
        return accumulator;
      },
      { data: [] },
    );
  const data = event.data.join("\n");
  if (event.event === "chunk") {
    try {
      const parsed = JSON.parse(data) as { chunk?: string; encoding?: string };
      const rawChunk = parsed.chunk ?? "";
      const chunk = parsed.encoding === "base64" ? atob(rawChunk) : rawChunk;
      handlers.onChunk(chunk);
    } catch {
      handlers.onChunk(data);
    }
    return;
  }
  if (event.event === "final") {
    const payload = JSON.parse(data) as ExecuteResponse;
    if (payload.bodyEncoding === "base64") {
      payload.body = decodeBase64(payload.body);
    }
    await handlers.onFinal(payload);
  }
}
