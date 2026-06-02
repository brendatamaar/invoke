import { useEffect, useMemo, useReducer, useState } from "react";
import { useStore } from "../../../store";
import type { DirectionFilter } from "../types";
import { CodeTab } from "../../response/components/CodeTab";
import { HandshakeTab } from "./tabs/HandshakeTab";
import { WebSocketDiffBar } from "./WebSocketDiffBar";
import { WebSocketLogList } from "./WebSocketLogList";
import { WebSocketLogToolbar } from "./WebSocketLogToolbar";
import { WsLogDiffModal } from "./WsLogDiffModal";

type LogTab = "messages" | "handshake" | "code";

export function WebSocketLogPanel() {
  const { wsSessions, activeWsSessionId, setWsSession } = useStore();
  const activeSession = wsSessions.find((s) => s.id === activeWsSessionId) ?? wsSessions[0];
  const [logTab, setLogTab] = useState<LogTab>("messages");

  type LogPanelState = { search: string; dirFilter: DirectionFilter; prettyJson: boolean; expandedIds: Set<string>; diffSelected: string[]; showDiff: boolean };
  const [logState, logDispatch] = useReducer(
    (prev: LogPanelState, patch: Partial<LogPanelState>) => ({ ...prev, ...patch }),
    { search: "", dirFilter: "all" as DirectionFilter, prettyJson: false, expandedIds: new Set<string>(), diffSelected: [], showDiff: false },
  );
  const { search, dirFilter, prettyJson, expandedIds, diffSelected, showDiff } = logState;
  const setSearch = (v: string) => logDispatch({ search: v });
  const setDirFilter = (v: DirectionFilter) => logDispatch({ dirFilter: v });
  const setPrettyJson = (v: boolean) => logDispatch({ prettyJson: v });
  const setExpandedIds = (v: Set<string> | ((prev: Set<string>) => Set<string>)) =>
    logDispatch({ expandedIds: typeof v === "function" ? v(logState.expandedIds) : v });
  const setDiffSelected = (v: string[] | ((prev: string[]) => string[])) =>
    logDispatch({ diffSelected: typeof v === "function" ? v(logState.diffSelected) : v });
  const setShowDiff = (v: boolean) => logDispatch({ showDiff: v });

  const filteredLog = useMemo(() => {
    let entries = (activeSession?.log ?? []).filter((e) => e.type !== "handshake");
    if (dirFilter !== "all") {
      entries = entries.filter((e) => e.direction === dirFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter((e) => e.body.toLowerCase().includes(q));
    }
    return entries;
  }, [activeSession?.log, dirFilter, search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault();
        if (activeSession) setWsSession(activeSession.id, { log: [] });
      }
      if (e.key === "Escape" && search) setSearch("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSession, search, setWsSession]);

  const toggleDiffSelect = (id: string) => {
    setDiffSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const clearLog = () => {
    if (activeSession) setWsSession(activeSession.id, { log: [] });
  };

  const copyAll = () => {
    const text = (activeSession?.log ?? [])
      .map((e) => `[${new Date(e.createdAt).toISOString()}] [${e.direction}] ${e.body}`)
      .join("\n");
    navigator.clipboard
      .writeText(text)
      .catch((error: unknown) =>
        useStore
          .getState()
          .addToast(
            "error",
            `Copy failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
      );
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const websocketState = activeSession?.state ?? "disconnected";
  const allLog = activeSession?.log ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center border-b border-[var(--border)] shrink-0 px-2">
        {(["messages", "handshake", "code"] as LogTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setLogTab(tab)}
            className={`px-3 py-1.5 text-2xs border-b-2 transition-colors capitalize ${
              logTab === tab
                ? "border-[var(--accent)] text-[var(--text-1)]"
                : "border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {logTab === "messages" && (
        <>
          <WebSocketLogToolbar
            search={search}
            dirFilter={dirFilter}
            prettyJson={prettyJson}
            onSearch={setSearch}
            onDirectionFilter={setDirFilter}
            onPrettyJson={() => setPrettyJson((v) => !v)}
            onCopyAll={copyAll}
            onClearLog={clearLog}
          />
          <WebSocketLogList
            entries={filteredLog}
            prettyJson={prettyJson}
            expandedIds={expandedIds}
            diffSelected={diffSelected}
            search={search}
            dirFilter={dirFilter}
            websocketState={websocketState}
            onToggleExpanded={toggleExpanded}
            onToggleDiff={toggleDiffSelect}
          />
          <WebSocketDiffBar
            selectedCount={diffSelected.length}
            onOpen={() => setShowDiff(true)}
            onClear={() => {
              setDiffSelected([]);
              setShowDiff(false);
            }}
          />
          {showDiff && diffSelected.length === 2 && (
            <WsLogDiffModal
              left={allLog.find((e) => e.id === diffSelected[0])}
              right={allLog.find((e) => e.id === diffSelected[1])}
              onClose={() => setShowDiff(false)}
            />
          )}
        </>
      )}

      {logTab === "handshake" && <HandshakeTab />}
      {logTab === "code" && <CodeTab />}
    </div>
  );
}
