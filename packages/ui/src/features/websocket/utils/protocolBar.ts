import type { WebSocketLogItem } from "../../../types";

export type WsDirection = WebSocketLogItem["direction"];

export interface WsRelayEvent {
  direction: string;
  type: string;
  body: string;
  createdAt: number;
}

export function mapDirection(serverDirection: string): WsDirection {
  if (serverDirection === "out") return "sent";
  if (serverDirection === "system") return "system";
  return "received";
}

export function makeWsLogEntries(
  message: WsRelayEvent,
  ndjsonMode: boolean,
): WebSocketLogItem[] {
  const inbound = message.direction !== "out";
  const lines =
    inbound && ndjsonMode && message.type !== "binary"
      ? message.body.split("\n").filter((line) => line.trim())
      : [message.body];

  return lines.map((body) => ({
    id: crypto.randomUUID(),
    direction: mapDirection(message.direction),
    type: message.type,
    body,
    createdAt: message.createdAt || Date.now(),
  }));
}

export function parseWsCloseReason(event: Event) {
  try {
    const data = JSON.parse((event as MessageEvent).data ?? "{}") as {
      reason?: string;
    };
    return data.reason || "Disconnected by server";
  } catch {
    return "Disconnected by server";
  }
}

export function wsStateColor(state: "disconnected" | "connecting" | "connected") {
  return {
    disconnected: "bg-[var(--danger)]",
    connecting: "bg-yellow-400 animate-pulse",
    connected: "bg-[var(--ok)]",
  }[state];
}
