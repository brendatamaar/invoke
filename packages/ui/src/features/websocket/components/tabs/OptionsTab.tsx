import { useStore } from "../../../../store";

export function OptionsTab() {
  const { set, websocketRequest, setWebsocketRequest } = useStore();

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="ws-protocols" className="text-xs text-[var(--text-2)] w-28 shrink-0">Sub-protocols</label>
        <input
          id="ws-protocols"
          value={websocketRequest.protocols ?? ""}
          onChange={(e) => setWebsocketRequest({ protocols: e.target.value })}
          placeholder="chat, superchat"
          className="input text-xs flex-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="ws-origin" className="text-xs text-[var(--text-2)] w-28 shrink-0">Origin header</label>
        <input
          id="ws-origin"
          value={websocketRequest.origin ?? ""}
          onChange={(e) => setWebsocketRequest({ origin: e.target.value })}
          placeholder="https://app.example.com"
          className="input text-xs flex-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="ws-timeout" className="text-xs text-[var(--text-2)] w-28 shrink-0">Timeout (ms)</label>
        <input
          id="ws-timeout"
          type="number"
          value={websocketRequest.timeoutMs ?? 30000}
          onChange={(e) => setWebsocketRequest({ timeoutMs: Number(e.target.value) })}
          min={0}
          className="input text-xs w-28"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={websocketRequest.autoReconnect ?? false}
          onChange={(e) => setWebsocketRequest({ autoReconnect: e.target.checked })}
        />
        <span className="text-xs text-[var(--text-2)]">Auto-reconnect on disconnect</span>
      </label>
      {websocketRequest.autoReconnect && (
        <div className="ml-6 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-28 shrink-0">Delay (ms)</label>
            <input
              type="number"
              value={websocketRequest.reconnectDelay ?? 2000}
              onChange={(e) => setWebsocketRequest({ reconnectDelay: Number(e.target.value) })}
              min={100}
              className="input text-xs w-28"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-28 shrink-0">Max retries</label>
            <input
              type="number"
              value={websocketRequest.reconnectMaxRetries ?? ""}
              onChange={(e) =>
                setWebsocketRequest({
                  reconnectMaxRetries: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              min={1}
              placeholder="unlimited"
              className="input text-xs w-28"
            />
          </div>
        </div>
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={websocketRequest.ndjsonMode ?? false}
          onChange={(e) => setWebsocketRequest({ ndjsonMode: e.target.checked })}
        />
        <span className="text-xs text-[var(--text-2)]">NDJSON mode (split frames on newlines)</span>
      </label>
      <button
        type="button"
        onClick={() => set({ showSettings: true, settingsTab: "network" })}
        className="text-left text-2xs text-[var(--text-3)] hover:text-[var(--text-1)]"
      >
        TLS and certificate policy is in Settings &gt; Network.
      </button>
    </div>
  );
}
