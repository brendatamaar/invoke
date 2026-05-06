import type {
  AuthConfig,
  ExecuteResponse,
  GrpcExecuteResponse,
  GrpcMethodInfo,
  GrpcRequestConfig,
  MockLogEntry,
  MockRoute,
  RequestConfig,
  WebSocketRelayMessage,
  WebSocketRequestConfig,
} from "@invoke/core";

export async function ping() {
  const response = await fetch("/api/ping");
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{
    message: string;
    version: string;
    uptimeMs: number;
  }>;
}

export async function execute(
  request: RequestConfig,
): Promise<ExecuteResponse> {
  const response = await fetch("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildExecutePayload(request)),
  });
  if (!response.ok) throw new Error(await response.text());
  const payload = (await response.json()) as ExecuteResponse;
  if (payload.bodyEncoding === "base64")
    payload.body = decodeBase64(payload.body);
  return payload;
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

export async function loadMockRoutes(): Promise<{
  routes: MockRoute[];
  logs: MockLogEntry[];
}> {
  const res = await fetch("/api/mock/routes");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ routes: MockRoute[]; logs: MockLogEntry[] }>;
}

export async function syncMockRoutes(
  routes: MockRoute[],
): Promise<{ routes: MockRoute[]; count: number }> {
  const res = await fetch("/api/mock/routes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routes }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ routes: MockRoute[]; count: number }>;
}

export async function clearMockLogs() {
  const res = await fetch("/api/mock/logs", { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export async function webSocketConnect(
  request: WebSocketRequestConfig,
): Promise<{ connectionId: string; error?: string }> {
  const res = await fetch("/api/websocket/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildWsPayload(request)),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ connectionId: string; error?: string }>;
}

export async function webSocketSend(
  connectionId: string,
  body: string,
  binary = false,
): Promise<{ error?: string }> {
  const res = await fetch("/api/websocket/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, body, binary }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ error?: string }>;
}

export async function webSocketPoll(connectionId: string): Promise<{
  messages: WebSocketRelayMessage[];
  connected: boolean;
  error?: string;
}> {
  const res = await fetch("/api/websocket/poll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, maxMessages: 100 }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    messages: WebSocketRelayMessage[];
    connected: boolean;
    error?: string;
  }>;
}

export async function webSocketClose(
  connectionId: string,
): Promise<{ error?: string }> {
  const res = await fetch("/api/websocket/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ error?: string }>;
}

export async function grpcReflect(
  request: GrpcRequestConfig,
): Promise<{ methods: GrpcMethodInfo[]; error?: string }> {
  const res = await fetch("/api/grpc/reflect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildGrpcPayload(request)),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ methods: GrpcMethodInfo[]; error?: string }>;
}

export async function grpcExecute(
  request: GrpcRequestConfig,
): Promise<GrpcExecuteResponse> {
  const res = await fetch("/api/grpc/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...buildGrpcPayload(request),
      fullMethod: grpcFullMethod(request),
      bodyJson: request.body,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<GrpcExecuteResponse>;
}

export async function oauth2ClientCredentials(auth: AuthConfig): Promise<{
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  error?: string;
}> {
  const res = await fetch("/api/oauth2/client-credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenUrl: auth.tokenUrl,
      clientId: auth.clientId,
      clientSecret: auth.clientSecret,
      scope: auth.scope,
    }),
  });
  const payload = (await res.json()) as {
    accessToken?: string;
    tokenType?: string;
    expiresIn?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(payload.error || res.statusText);
  return payload;
}

// Helpers
function buildExecutePayload(req: RequestConfig) {
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.bodyMode === "none" ? "" : req.body,
    auth: req.auth,
    timeoutMs: req.timeoutMs,
    followRedirects: req.options?.followRedirects ?? true,
    maxRedirects: req.options?.maxRedirects ?? 10,
    verifySsl: req.options?.verifySsl ?? true,
    proxy: req.options?.proxy,
    tlsClientConfig: req.options?.tlsClientConfig,
  };
}

function buildWsPayload(req: WebSocketRequestConfig) {
  return {
    url: req.url,
    headers: req.headers,
    protocols: (req.protocols ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
    timeoutMs: req.timeoutMs ?? 30000,
    verifySsl: req.options?.verifySsl ?? true,
    tlsClientConfig: req.options?.tlsClientConfig,
  };
}

function buildGrpcPayload(req: GrpcRequestConfig) {
  return {
    address: req.address,
    tls: req.tls,
    timeoutMs: req.timeoutMs,
    metadata: req.metadata,
    verifySsl: req.options?.verifySsl ?? true,
    tlsClientConfig: req.options?.tlsClientConfig,
  };
}

function grpcFullMethod(req: GrpcRequestConfig) {
  if (req.method.trim().startsWith("/")) return req.method.trim();
  return `/${req.service.trim()}/${req.method.trim()}`;
}

async function handleSseEvent(
  rawEvent: string,
  handlers: {
    onChunk: (chunk: string) => void;
    onFinal: (r: ExecuteResponse) => void | Promise<void>;
  },
) {
  const ev = rawEvent
    .split(/\r?\n/)
    .map((l) => l.trim())
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
      handlers.onChunk((JSON.parse(data) as { chunk?: string }).chunk ?? "");
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

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
