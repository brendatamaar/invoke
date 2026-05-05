import { RefreshCw, Trash2 } from "lucide-react";
import { useStore } from "../../store";
import { loadMockRoutes, syncMockRoutes, clearMockLogs } from "../../lib/api";
import { MethodBadge } from "../shared/MethodBadge";

export function MockPanel() {
  const { mockRoutes, mockLogs, mockStatus, set, addToast } = useStore();

  const refresh = async () => {
    try {
      const data = await loadMockRoutes();
      set({ mockRoutes: data.routes, mockLogs: data.logs });
    } catch (e) { addToast("error", String(e)); }
  };

  const sync = async () => {
    if (!mockRoutes.length) { addToast("warn", "No routes to sync"); return; }
    try {
      set({ mockStatus: "Syncing…" });
      await syncMockRoutes(mockRoutes);
      set({ mockStatus: "Active" });
      addToast("success", "Mock routes synced");
    } catch (e) { set({ mockStatus: "Error" }); addToast("error", String(e)); }
  };

  const clearLogs = async () => {
    try { await clearMockLogs(); set({ mockLogs: [] }); } catch (e) { addToast("error", String(e)); }
  };

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Mock Server</span>
        <div className="flex items-center gap-1">
          {mockStatus && <span className={`text-2xs px-1.5 py-0.5 rounded ${mockStatus === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-[var(--surface-2)] text-[var(--text-3)]"}`}>{mockStatus}</span>}
          <button onClick={refresh} className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"><RefreshCw size={12} /></button>
        </div>
      </div>

      {/* Routes */}
      <div className="border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-2xs text-[var(--text-3)]">Routes ({mockRoutes.length})</span>
          <button onClick={sync} className="btn text-2xs py-0.5 px-2">Sync</button>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {mockRoutes.map((r, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--surface-2)] border-b border-[var(--border)] last:border-0">
              <MethodBadge method={r.method} />
              <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate">{r.path}</span>
              <span className="text-2xs text-[var(--text-3)]">{r.status}</span>
            </div>
          ))}
          {!mockRoutes.length && <p className="p-3 text-xs text-[var(--text-3)] text-center">No routes</p>}
        </div>
      </div>

      {/* Logs */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)]">
        <span className="text-2xs text-[var(--text-3)]">Request Log ({mockLogs.length})</span>
        <button onClick={clearLogs} className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"><Trash2 size={12} /></button>
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-2xs">
        {mockLogs.map((log, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
            <span className="text-[var(--text-3)] shrink-0">{fmt(log.timestamp)}</span>
            <MethodBadge method={log.method} />
            <span className="flex-1 text-[var(--text-1)] truncate">{log.path}</span>
            <span className={`shrink-0 ${log.status >= 400 ? "text-red-600" : "text-emerald-600"}`}>{log.status}</span>
          </div>
        ))}
        {!mockLogs.length && <p className="p-3 text-xs text-[var(--text-3)] text-center">No requests yet</p>}
      </div>
    </div>
  );
}
