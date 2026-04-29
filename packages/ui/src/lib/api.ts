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
  WebSocketRequestConfig
} from "@invoke/core";

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
  let streamDone = false;
  while (!streamDone) {
    const { value, done } = await reader.read();
    streamDone = done;
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) await handleSseEvent(event, handlers);
  }
  if (buffer.trim()) await handleSseEvent(buffer, handlers);
}

export async function loadMockRoutes(): Promise<{ routes: MockRoute[]; logs: MockLogEntry[] }> {
  const response = await fetch("/api/mock/routes");
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ routes: MockRoute[]; logs: MockLogEntry[] }>;
}

export async function syncMockRoutes(routes: MockRoute[]): Promise<{ routes: MockRoute[]; count: number }> {
  const response = await fetch("/api/mock/routes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routes })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ routes: MockRoute[]; count: number }>;
}

export async function clearMockLogs() {
  const response = await fetch("/api/mock/logs", { method: "DELETE" });
  if (!response.ok) throw new Error(await response.text());
}

export async function webSocketConnect(request: WebSocketRequestConfig): Promise<{ connectionId: string; error?: string }> {
  const response = await fetch("/api/websocket/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webSocketConnectPayload(request))
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ connectionId: string; error?: string }>;
}

export async function webSocketSend(connectionId: string, body: string, binary = false): Promise<{ error?: string }> {
  const response = await fetch("/api/websocket/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, body, binary })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ error?: string }>;
}

export async function webSocketPoll(connectionId: string): Promise<{ messages: WebSocketRelayMessage[]; connected: boolean; error?: string }> {
  const response = await fetch("/api/websocket/poll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, maxMessages: 100 })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ messages: WebSocketRelayMessage[]; connected: boolean; error?: string }>;
}

export async function webSocketClose(connectionId: string): Promise<{ error?: string }> {
  const response = await fetch("/api/websocket/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ error?: string }>;
}

export async function grpcReflect(request: GrpcRequestConfig): Promise<{ methods: GrpcMethodInfo[]; error?: string }> {
  const response = await fetch("/api/grpc/reflect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(grpcPayload(request))
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ methods: GrpcMethodInfo[]; error?: string }>;
}

export async function grpcExecute(request: GrpcRequestConfig): Promise<GrpcExecuteResponse> {
  const response = await fetch("/api/grpc/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...grpcPayload(request), fullMethod: grpcFullMethod(request), bodyJson: request.body })
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<GrpcExecuteResponse>;
}

export async function oauth2ClientCredentials(auth: AuthConfig): Promise<{ accessToken?: string; tokenType?: string; expiresIn?: number; error?: string }> {
  const response = await fetch("/api/oauth2/client-credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenUrl: auth.tokenUrl,
      clientId: auth.clientId,
      clientSecret: auth.clientSecret,
      scope: auth.scope
    })
  });
  const payload = (await response.json()) as { accessToken?: string; tokenType?: string; expiresIn?: number; error?: string };
  if (!response.ok) throw new Error(payload.error || response.statusText);
  return payload;
}

function executePayload(request: RequestConfig) {
  return {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.bodyMode === "none" ? "" : request.body,
    auth: request.auth,
    timeoutMs: request.timeoutMs,
    followRedirects: request.options?.followRedirects ?? true,
    maxRedirects: request.options?.maxRedirects ?? 10,
    verifySsl: request.options?.verifySsl ?? true,
    proxy: request.options?.proxy,
    tlsClientConfig: request.options?.tlsClientConfig
  };
}

function webSocketConnectPayload(request: WebSocketRequestConfig) {
  return {
    url: request.url,
    headers: request.headers,
    protocols: (request.protocols ?? "")
      .split(",")
      .map((protocol) => protocol.trim())
      .filter(Boolean),
    timeoutMs: request.timeoutMs ?? 30000,
    verifySsl: request.options?.verifySsl ?? true,
    tlsClientConfig: request.options?.tlsClientConfig
  };
}

function grpcPayload(request: GrpcRequestConfig) {
  return {
    address: request.address,
    tls: request.tls,
    timeoutMs: request.timeoutMs,
    metadata: request.metadata,
    verifySsl: request.options?.verifySsl ?? true,
    tlsClientConfig: request.options?.tlsClientConfig
  };
}

function grpcFullMethod(request: GrpcRequestConfig) {
  if (request.method.trim().startsWith("/")) return request.method.trim();
  return `/${request.service.trim()}/${request.method.trim()}`;
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
