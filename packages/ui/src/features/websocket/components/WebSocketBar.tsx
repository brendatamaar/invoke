import type { WsPreset } from "@invoke/core";
import { Select } from "../../../components/shared/Select";
import { useWebSocketBar } from "../hooks/useWebSocketBar";
import { WebSocketBarActions } from "./WebSocketBarActions";

export function WebSocketBar() {
  const bar = useWebSocketBar();
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className={`w-2 h-2 rounded-full shrink-0 ${bar.stateColor}`} />
      <input
        value={bar.websocketRequest.url}
        onChange={(event) => bar.setWebsocketRequest({ url: event.target.value })}
        placeholder="wss://echo.websocket.org"
        disabled={bar.state !== "disconnected"}
        className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
      />
      <Select
        value={bar.websocketRequest.preset ?? "none"}
        onChange={(event) =>
          bar.setWebsocketRequest({ preset: event.target.value as WsPreset })
        }
        disabled={bar.state !== "disconnected"}
        size="xs"
        wrapperClassName="shrink-0"
      >
        <option value="none">No preset</option>
        <option value="graphql-transport-ws">graphql-transport-ws</option>
      </Select>
      <WebSocketBarActions
        activeSession={bar.activeSession}
        state={bar.state}
        onSendPing={bar.sendPing}
        onDisconnect={bar.disconnect}
        onCancelConnect={bar.cancelConnect}
        onConnect={bar.connect}
      />
    </div>
  );
}
