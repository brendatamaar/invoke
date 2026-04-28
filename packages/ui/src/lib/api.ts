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
    body: JSON.stringify(executePayload(request))
  });
  if (!response.ok) throw new Error(await response.text());
  const payload = (await response.json()) as ExecuteResponse;
  if (payload.bodyEncoding === "base64") {
    payload.body = decodeBase64Body(payload.body);
  }
  return payload;
}

export async function executeStream(
  request: RequestConfig,
  handlers: {
    onChunk: (chunk: string) => void;
    onFinal: (response: ExecuteResponse) => void | Promise<void>;
    signal?: AbortSignal;
  }
) {
  const response = await fetch("/api/execute/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(executePayload(request)),
    signal: handlers.signal
  });
  if (!response.ok || !response.body) throw new Error(await response.text());

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) await handleSseEvent(event, handlers);
  }
  if (buffer.trim()) await handleSseEvent(buffer, handlers);
}

function executePayload(request: RequestConfig) {
  return {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.bodyMode === "none" ? "" : request.body,
    timeoutMs: request.timeoutMs,
    followRedirects: request.options?.followRedirects ?? true,
    maxRedirects: request.options?.maxRedirects ?? 10,
    verifySsl: request.options?.verifySsl ?? true,
    proxy: request.options?.proxy
  };
}

async function handleSseEvent(
  rawEvent: string,
  handlers: {
    onChunk: (chunk: string) => void;
    onFinal: (response: ExecuteResponse) => void | Promise<void>;
  }
) {
  const event = rawEvent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .reduce<{ event?: string; data: string[] }>(
      (acc, line) => {
        if (line.startsWith("event:")) acc.event = line.slice(6).trim();
        if (line.startsWith("data:")) acc.data.push(line.slice(5).trimStart());
        return acc;
      },
      { data: [] }
    );
  const data = event.data.join("\n");
  if (event.event === "chunk") {
    try {
      const parsed = JSON.parse(data) as { chunk?: string };
      handlers.onChunk(parsed.chunk ?? "");
    } catch {
      handlers.onChunk(data);
    }
    return;
  }
  if (event.event === "final") {
    const payload = JSON.parse(data) as ExecuteResponse;
    if (payload.bodyEncoding === "base64") payload.body = decodeBase64Body(payload.body);
    await handlers.onFinal(payload);
  }
}

function decodeBase64Body(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
