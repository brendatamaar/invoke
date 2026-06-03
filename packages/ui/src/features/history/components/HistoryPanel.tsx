import { ArrowLeftRight, Search, Trash2 } from "lucide-react";
import type { HistoryEntry, HttpMethod, KeyValue } from "@invoke/core";
import { useMockRoutes, useHistory } from "../../../hooks/useDb";
import { useStore, coreStore } from "../../../store";
import { HistoryGroup } from "./HistoryGroup";
import { groupHistoryByDate, matchesHistoryQuery } from "../utils/grouping";

export function HistoryPanel() {
  const { historyQuery, set, setRequest, addToast } = useStore();
  const history = useHistory();
  const mockRoutes = useMockRoutes();

  const filtered = historyQuery.trim()
    ? history.filter((entry) => matchesHistoryQuery(entry, historyQuery))
    : history;
  const pinned = filtered.filter((entry) => entry.pinned);
  const grouped = groupHistoryByDate(filtered.filter((entry) => !entry.pinned));

  const restore = (entry: HistoryEntry) => {
    const request = entry.request as Parameters<typeof setRequest>[0] | undefined;
    const headers = (request?.headers as KeyValue[] | undefined)?.filter(
      (h) => h.value !== "[redacted]",
    );
    setRequest({
      ...(request ?? {}),
      ...(headers !== undefined ? { headers } : {}),
      protocol: entry.protocol ?? "rest",
    } as Parameters<typeof setRequest>[0]);
    addToast("info", "Request restored");
  };

  const deleteEntry = async (entry: HistoryEntry) => {
    try {
      await coreStore.deleteHistoryEntry(entry.id);
    } catch (error) {
      addToast("error", String(error));
    }
  };

  const deleteGroup = async (entries: HistoryEntry[]) => {
    try {
      await coreStore.deleteHistoryEntries(entries.map((entry) => entry.id));
    } catch (error) {
      addToast("error", String(error));
    }
  };

  const handlePin = async (entry: HistoryEntry, pinned: boolean) => {
    try {
      await coreStore.pinHistoryEntry(entry.id, pinned);
    } catch (error) {
      addToast("error", String(error));
    }
  };

  const handleLabel = async (entry: HistoryEntry, label: string) => {
    try {
      await coreStore.setHistoryEntryLabel(entry.id, label);
    } catch (error) {
      addToast("error", String(error));
    }
  };

  const handleCreateMock = (entry: HistoryEntry) => {
    const request = entry.request as { method?: string; url?: string } | undefined;
    let path = "/";
    try {
      path = new URL(request?.url ?? "").pathname || "/";
    } catch {
      path = request?.url ?? "/";
    }
    const newRoute = {
      id: Math.random().toString(36).slice(2),
      enabled: true,
      method: (request?.method ?? "GET") as HttpMethod,
      pathPattern: path,
      status: entry.response?.status ?? 200,
      headers: (entry.response?.headers ?? []).filter(
        (header) =>
          !["content-encoding", "transfer-encoding", "connection"].includes(
            header.key.toLowerCase(),
          ),
      ),
      body: entry.response?.body ?? "",
      latencyMs: 0,
    };
    coreStore
      .setMeta("mockRoutes", [...mockRoutes, newRoute])
      .then(() => {
        set({ sidebarCollapsed: false, sidebarSection: "mocks" });
        addToast("success", "Mock route created");
      })
      .catch((error: unknown) =>
        addToast(
          "error",
          `Failed to create mock route: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider flex-1">
          History
        </span>
        <button
          type="button"
          onClick={() => set({ showDiffModal: true })}
          className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
          title="Compare responses"
        >
          <ArrowLeftRight size={12} />
        </button>
        <button
          type="button"
          onClick={() => set({ showClearHistoryModal: true })}
          className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
          title="Clear all history"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-3)]"
          />
          <input
            value={historyQuery}
            onChange={(event) => set({ historyQuery: event.target.value })}
            placeholder="Search history..."
            aria-label="Search history"
            className="input text-xs py-1"
            style={{ paddingLeft: "1.5rem" }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="p-4 text-xs text-[var(--text-3)] text-center">No history</p>
        )}
        {pinned.length > 0 && (
          <HistoryGroup
            label="Pinned"
            entries={pinned}
            restore={restore}
            onDeleteGroup={() => {}}
            onDeleteEntry={deleteEntry}
            onPin={handlePin}
            onLabel={handleLabel}
            onCreateMock={handleCreateMock}
          />
        )}
        {grouped.map((group) => (
          <HistoryGroup
            key={group.label}
            label={group.label}
            entries={group.entries}
            restore={restore}
            onDeleteGroup={() => deleteGroup(group.entries)}
            onDeleteEntry={deleteEntry}
            onPin={handlePin}
            onLabel={handleLabel}
            onCreateMock={handleCreateMock}
          />
        ))}
      </div>
    </div>
  );
}
