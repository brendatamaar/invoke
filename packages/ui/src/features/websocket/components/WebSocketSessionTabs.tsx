import { Plus, X } from "lucide-react";
import { useStore } from "../../../store";
import { webSocketClose } from "../api";

export function WebSocketSessionTabs() {
  const {
    wsSessions,
    activeWsSessionId,
    addWsSession,
    closeWsSession,
    setActiveWsSession,
  } = useStore();

  return (
    <div className="flex items-center gap-0.5 px-2 pt-1.5 border-b border-[var(--border)] overflow-x-auto shrink-0">
      {wsSessions.map((sess) => (
        <div
          key={sess.id}
          onClick={() => setActiveWsSession(sess.id)}
          className={`flex items-center gap-1 px-2 py-1 rounded-t text-2xs cursor-pointer select-none whitespace-nowrap ${
            sess.id === activeWsSessionId
              ? "bg-[var(--surface-2)] text-[var(--text-1)] border border-b-0 border-[var(--border)]"
              : "text-[var(--text-3)] hover:text-[var(--text-2)]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              sess.state === "connected"
                ? "bg-[var(--ok)]"
                : sess.state === "connecting"
                  ? "bg-yellow-400 animate-pulse"
                  : "bg-[var(--text-4,#888)]"
            }`}
          />
          {sess.label}
          {wsSessions.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (sess.connectionId) {
                  webSocketClose(sess.connectionId).catch(() => {});
                }
                closeWsSession(sess.id);
              }}
              className="ml-0.5 opacity-50 hover:opacity-100 rounded"
            >
              <X size={10} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addWsSession}
        className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] rounded"
        title="New session"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
