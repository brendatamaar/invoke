import { Search, RotateCcw, Trash2 } from "lucide-react";
import { useStore } from "../../store";
import { MethodBadge } from "../shared/MethodBadge";
import { StatusBadge } from "../shared/StatusBadge";
import type { HistoryEntry } from "@invoke/core";

export function HistoryPanel() {
  const { history, historyQuery, set, setRequest, addToast } = useStore();

  const filtered = historyQuery.trim()
    ? history.filter((h) => {
        const req = h.request as { method?: string; url?: string } | undefined;
        return `${req?.method ?? ""} ${req?.url ?? ""} ${h.response?.status ?? ""}`.toLowerCase().includes(historyQuery.toLowerCase());
      })
    : history;

  const restore = (entry: HistoryEntry) => {
    const req = entry.request as { method?: string; url?: string; headers?: unknown[]; body?: string } | undefined;
    setRequest({
      method: (req?.method ?? "GET") as Parameters<typeof setRequest>[0]["method"],
      url: req?.url ?? "",
      headers: (req?.headers ?? []) as Parameters<typeof setRequest>[0]["headers"],
      body: req?.body ?? ""
    });
    addToast("info", "Request restored");
  };

  const clearAll = () => {
    if (!confirm("Clear all history?")) return;
    set({ history: [] });
  };

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider flex-1">History</span>
        <button onClick={clearAll} className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5" title="Clear history"><Trash2 size={12} /></button>
      </div>
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input value={historyQuery} onChange={(e) => set({ historyQuery: e.target.value })} placeholder="Search history…" className="input text-xs py-1 pl-6" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && <p className="p-4 text-xs text-[var(--text-3)] text-center">No history</p>}
        {filtered.map((entry, i) => {
          const req = entry.request as { method?: string; url?: string } | undefined;
          return (
            <div key={entry.id ?? i} className="group flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)] border-b border-[var(--border)] cursor-pointer" onClick={() => restore(entry)}>
              <MethodBadge method={req?.method ?? "GET"} />
              <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate">{req?.url ?? "—"}</span>
              <StatusBadge status={entry.response?.status ?? 0} />
              <span className="text-2xs text-[var(--text-3)] shrink-0">{fmt(entry.createdAt)}</span>
              <button onClick={(e) => { e.stopPropagation(); restore(entry); }} className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--accent)]">
                <RotateCcw size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
