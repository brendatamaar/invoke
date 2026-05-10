import type {
  WebSocketRelayMessage,
  WebSocketRequestConfig,
} from "@invoke/core";
import { readJson } from "../../lib/http";

export async function webSocketConnect(
  request: WebSocketRequestConfig,
): Promise<{ connectionId: string; error?: string }> {
  const response = await fetch("/api/websocket/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildWsPayload(request)),
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

function buildWsPayload(req: WebSocketRequestConfig) {
  return {
    url: req.url,
    headers: req.headers,
    protocols: (req.protocols ?? "")
      .split(",")
      .map((protocol) => protocol.trim())
      .filter(Boolean),
    timeoutMs: req.timeoutMs ?? 30000,
    verifySsl: req.options?.verifySsl ?? true,
    tlsClientConfig: req.options?.tlsClientConfig,
  };
}
