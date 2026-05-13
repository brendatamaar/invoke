import type {
  AuthConfig,
  KeyValue,
  WebSocketRelayMessage,
  WebSocketRequestConfig,
} from "@invoke/core";
import { readJson } from "../../lib/http";
import { applyProtocolDefaults } from "../../lib/protocolDefaults";

export async function webSocketConnect(
  request: WebSocketRequestConfig,
  signal?: AbortSignal,
): Promise<{ connectionId: string; error?: string }> {
  const response = await fetch("/api/websocket/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildWsPayload(request)),
    signal,
  });
  return readJson<{ connectionId: string; error?: string }>(response);
}

export async function webSocketSend(
  connectionId: string,
  body: string,
  binary = false,
): Promise<{ error?: string }> {
  const response = await fetch("/api/websocket/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, body, binary }),
  });
  return readJson<{ error?: string }>(response);
}

export async function webSocketPoll(connectionId: string): Promise<{
  messages: WebSocketRelayMessage[];
  connected: boolean;
  error?: string;
}> {
  const response = await fetch("/api/websocket/poll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, maxMessages: 100 }),
  });
  return readJson<{
    messages: WebSocketRelayMessage[];
    connected: boolean;
    error?: string;
  }>(response);
}

export async function webSocketClose(
  connectionId: string,
): Promise<{ error?: string }> {
  const response = await fetch("/api/websocket/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId }),
  });
  return readJson<{ error?: string }>(response);
}

function applyWsAuth(headers: KeyValue[], auth: AuthConfig): KeyValue[] {
  const result = [...headers];
  if (auth.type === "basic" && auth.username != null) {
    result.push({
      key: "Authorization",
      value: `Basic ${btoa(`${auth.username}:${auth.password ?? ""}`)}`,
      enabled: true,
    });
  }
  if ((auth.type === "bearer" || auth.type === "oauth2") && auth.token) {
    result.push({
      key: "Authorization",
      value: `Bearer ${auth.token}`,
      enabled: true,
    });
  }
  if (
    auth.type === "api-key" &&
    auth.apiKeyName &&
    auth.apiKeyValue &&
    auth.apiKeyIn !== "query"
  ) {
    result.push({
      key: auth.apiKeyName,
      value: auth.apiKeyValue,
      enabled: true,
    });
  }
  return result;
}

function buildWsPayload(req: WebSocketRequestConfig) {
  req = applyProtocolDefaults(req, "websocket");
  let headers = applyWsAuth(req.headers, req.auth);
  if (req.origin?.trim()) {
    headers = headers.filter((h) => h.key.toLowerCase() !== "origin");
    headers.push({ key: "Origin", value: req.origin.trim(), enabled: true });
  }
  return {
    url: req.url,
    headers,
    protocols: (req.protocols ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
    timeoutMs: req.timeoutMs ?? 30000,
    verifySsl: req.options?.verifySsl ?? true,
    tlsClientConfig: req.options?.tlsClientConfig,
  };
}
