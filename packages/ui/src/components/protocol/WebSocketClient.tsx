import { useEffect, useRef } from "react";
import { useStore } from "../../store";
import { webSocketConnect, webSocketSend, webSocketPoll, webSocketClose } from "../../lib/api";
import { ArrowUp, ArrowDown, Unplug, Plug } from "lucide-react";

export function WebSocketClient() {
  const { websocketRequest, setWebsocketRequest, websocketState, websocketLog, websocketConnectionId, set, addToast } = useStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef("");

  const connect = async () => {
    set({ websocketState: "connecting", websocketLog: [] });
    try {
      const { connectionId, error } = await webSocketConnect(websocketRequest);
      if (error) throw new Error(error);
      set({ websocketState: "connected", websocketConnectionId: connectionId });
      pollRef.current = setInterval(() => pollMessages(connectionId), 1000);
    } catch (e) { set({ websocketState: "disconnected" }); addToast("error", String(e)); }
  };

  const pollMessages = async (id: string) => {
    try {
      const { messages, connected } = await webSocketPoll(id);
      if (!connected) { disconnect(); return; }
      if (messages.length) {
        set((s) => ({
          websocketLog: [
            ...s.websocketLog,
            ...messages.map((m) => ({ id: Math.random().toString(36).slice(2), direction: "received" as const, type: m.type, body: m.body, createdAt: Date.now() }))
          ]
        }));
      }
    } catch { /* connection might be gone */ }
  };

  const disconnect = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (websocketConnectionId) await webSocketClose(websocketConnectionId).catch(() => {});
    set({ websocketState: "disconnected", websocketConnectionId: "" });
  };

  const send = async () => {
    if (!msgRef.current.trim()) return;
    try {
      await webSocketSend(websocketConnectionId, msgRef.current);
      set((s) => ({
        websocketLog: [...s.websocketLog, { id: Math.random().toString(36).slice(2), direction: "sent", type: "text", body: msgRef.current, createdAt: Date.now() }]
      }));
      msgRef.current = "";
      (document.getElementById("ws-msg-input") as HTMLTextAreaElement).value = "";
    } catch (e) { addToast("error", String(e)); }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stateColor = { disconnected: "bg-red-500", connecting: "bg-yellow-400 animate-pulse", connected: "bg-emerald-500" }[websocketState];

  return (
    <div className="flex flex-col h-full">
      {/* Connection bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <div className={`w-2 h-2 rounded-full shrink-0 ${stateColor}`} />
        <input
          value={websocketRequest.url}
          onChange={(e) => setWebsocketRequest({ url: e.target.value })}
          placeholder="wss://echo.websocket.org"
          disabled={websocketState === "connected"}
          className="input text-xs py-1 font-mono flex-1"
        />
        {websocketState === "connected"
          ? <button onClick={disconnect} className="btn btn-danger text-xs gap-1"><Unplug size={12} /> Disconnect</button>
          : <button onClick={connect} className="btn btn-primary text-xs gap-1"><Plug size={12} /> Connect</button>
        }
      </div>

      {/* Message log */}
      <div className="flex-1 overflow-y-auto font-mono text-2xs p-2 flex flex-col gap-1">
        {websocketLog.map((entry) => (
          <div key={entry.id} className={`flex items-start gap-2 p-1.5 rounded ${entry.direction === "sent" ? "bg-blue-50" : "bg-[var(--surface-2)]"}`}>
            {entry.direction === "sent" ? <ArrowUp size={11} className="text-blue-600 mt-0.5 shrink-0" /> : <ArrowDown size={11} className="text-emerald-600 mt-0.5 shrink-0" />}
            <span className="flex-1 break-all text-[var(--text-1)]">{entry.body}</span>
            <span className="text-[var(--text-3)] shrink-0">{new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
        ))}
        {!websocketLog.length && <p className="text-[var(--text-3)] text-center mt-8">No messages</p>}
      </div>

      {/* Message composer */}
      <div className="border-t border-[var(--border)] p-2 flex gap-2">
        <textarea
          id="ws-msg-input"
          onChange={(e) => { msgRef.current = e.target.value; }}
          placeholder="Message…"
          disabled={websocketState !== "connected"}
          rows={2}
          className="input text-xs font-mono flex-1 resize-none py-1.5"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button onClick={send} disabled={websocketState !== "connected"} className="btn btn-primary text-xs self-end px-3">Send</button>
      </div>
    </div>
  );
}
