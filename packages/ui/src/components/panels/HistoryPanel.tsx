import { Search, Trash2, ArrowLeftRight, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useStore, coreStore } from "../../store";
import { MethodBadge } from "../shared/MethodBadge";
import { StatusBadge } from "../shared/StatusBadge";
import type { HistoryEntry } from "@invoke/core";

function HistoryGroup({ label, entries, restore, onDeleteGroup, onDeleteEntry }: {
  label: string;
  entries: HistoryEntry[];
  restore: (entry: HistoryEntry) => void;
  onDeleteGroup: () => void;
  onDeleteEntry: (entry: HistoryEntry) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <div className="group/hdr flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-1)] border-b border-[var(--border)] sticky top-0">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 flex-1 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider hover:text-[var(--text-1)]"
        >
          {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          {label}
          <span className="ml-1 normal-case font-normal">{entries.length}</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteGroup(); }}
          className="opacity-0 group-hover/hdr:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
          title={`Delete all ${label}`}
        >
          <Trash2 size={11} />
        </button>
      </div>
      {expanded && entries.map((entry, i) => {
        const req = entry.request as { method?: string; url?: string } | undefined;
        return (
          <div key={entry.id ?? i} className="group flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)] border-b border-[var(--border)] cursor-pointer" onClick={() => restore(entry)}>
            <MethodBadge method={req?.method ?? "GET"} />
            <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate" title={req?.url}>{req?.url ?? "—"}</span>
            <StatusBadge status={entry.response?.status ?? 0} />
<button
              onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry); }}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)]"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

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

  const deleteEntry = async (entry: HistoryEntry) => {
    try {
      await coreStore.deleteHistoryEntry(entry.id);
      set({ history: history.filter((h) => h.id !== entry.id) });
    } catch (e) { addToast("error", String(e)); }
  };

  const deleteGroup = async (entries: HistoryEntry[]) => {
    try {
      const ids = entries.map((e) => e.id);
      await coreStore.deleteHistoryEntries(ids);
      const idSet = new Set(ids);
      set({ history: history.filter((h) => !idSet.has(h.id)) });
    } catch (e) { addToast("error", String(e)); }
  };

  const clearAll = () => set({ showClearHistoryModal: true });

  const dateLabel = (ts: number) => {
    const now = new Date();
    const d = new Date(ts);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    if (d.getTime() >= startOfToday) return "Today";
    if (d.getTime() >= startOfYesterday) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  };

  const grouped = filtered.reduce<{ label: string; entries: typeof filtered }[]>((acc, entry) => {
    const label = dateLabel(entry.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.entries.push(entry);
    else acc.push({ label, entries: [entry] });
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider flex-1">History</span>
        <button onClick={() => set({ showDiffModal: true })} className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5" title="Compare responses"><ArrowLeftRight size={12} /></button>
        <button onClick={clearAll} className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5" title="Clear all history"><Trash2 size={12} /></button>
      </div>
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input value={historyQuery} onChange={(e) => set({ historyQuery: e.target.value })} placeholder="Search history…" className="input text-xs py-1" style={{ paddingLeft: "1.5rem" }} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && <p className="p-4 text-xs text-[var(--text-3)] text-center">No history</p>}
        {grouped.map((group) => (
          <HistoryGroup
            key={group.label}
            label={group.label}
            entries={group.entries}
            restore={restore}
            onDeleteGroup={() => deleteGroup(group.entries)}
            onDeleteEntry={deleteEntry}
          />
        ))}
      </div>
    </div>
  );
}
