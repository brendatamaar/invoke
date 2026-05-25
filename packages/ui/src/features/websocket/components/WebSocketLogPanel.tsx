import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../../store";
import type { DirectionFilter } from "../types";
import { WebSocketDiffBar } from "./WebSocketDiffBar";
import { WebSocketLogList } from "./WebSocketLogList";
import { WebSocketLogToolbar } from "./WebSocketLogToolbar";
import { WsLogDiffModal } from "./WsLogDiffModal";

export function WebSocketLogPanel() {
  const { wsSessions, activeWsSessionId, setWsSession } = useStore();
  const activeSession =
    wsSessions.find((s) => s.id === activeWsSessionId) ?? wsSessions[0];

  const [search, setSearch] = useState("");
  const [dirFilter, setDirFilter] = useState<DirectionFilter>("all");
  const [prettyJson, setPrettyJson] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [diffSelected, setDiffSelected] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  const filteredLog = useMemo(() => {
    let entries = activeSession?.log ?? [];
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
      .map(
        (e) =>
          `[${new Date(e.createdAt).toISOString()}] [${e.direction}] ${e.body}`,
      )
      .join("\n");
    navigator.clipboard.writeText(text).catch((error: unknown) =>
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
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const websocketState = activeSession?.state ?? "disconnected";
  const allLog = activeSession?.log ?? [];

  return (
    <div className="flex flex-col h-full">
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
    </div>
  );
}
