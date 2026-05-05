import { useRef } from "react";
import { useStore } from "../../store";
import { webSocketSend } from "../../lib/api";
import { ArrowUp, ArrowDown } from "lucide-react";

export function WebSocketClient() {
  const { websocketConnectionId, websocketLog, websocketState, set, addToast } = useStore();
  const msgRef = useRef("");

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

  return (
    <div className="flex flex-col h-full">
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
