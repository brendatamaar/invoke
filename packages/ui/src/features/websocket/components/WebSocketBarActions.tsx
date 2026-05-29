import { Activity, Plug, Unplug, X } from "lucide-react";
import type { WsSession } from "../../../types";

export function WebSocketBarActions({
  activeSession,
  state,
  onSendPing,
  onDisconnect,
  onCancelConnect,
  onConnect,
}: {
  activeSession?: WsSession;
  state: "disconnected" | "connecting" | "connected";
  onSendPing: (sessionId: string) => void;
  onDisconnect: (sessionId: string) => void;
  onCancelConnect: (sessionId: string) => void;
  onConnect: (sessionId: string) => void;
}) {
  if (!activeSession) return null;
  return (
    <>
      {state === "connected" && activeSession.latencyMs !== undefined && (
        <span
          title="Round-trip latency from last ping"
          className="flex items-center gap-1 text-2xs text-[var(--ok)] font-mono shrink-0"
        >
          <Activity size={10} />
          {activeSession.latencyMs}ms
        </span>
      )}
      {state === "connected" && (
        <button
          type="button"
          onClick={() => onSendPing(activeSession.id)}
          title="Send ping and measure RTT"
          className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] rounded shrink-0"
        >
          <Activity size={13} />
        </button>
      )}
      {state === "connected" && (
        <button
          type="button"
          onClick={() => onDisconnect(activeSession.id)}
          className="btn btn-danger text-xs gap-1"
        >
          <Unplug size={12} /> Disconnect
        </button>
      )}
      {state === "connecting" && (
        <button
          type="button"
          onClick={() => onCancelConnect(activeSession.id)}
          className="btn btn-danger text-xs gap-1"
        >
          <X size={12} /> Cancel
        </button>
      )}
      {state === "disconnected" && (
        <button
          type="button"
          onClick={() => onConnect(activeSession.id)}
          className="btn btn-primary text-xs gap-1 shrink-0"
          title="Connect (Ctrl+Enter)"
        >
          <Plug size={12} /> Connect
        </button>
      )}
    </>
  );
}
