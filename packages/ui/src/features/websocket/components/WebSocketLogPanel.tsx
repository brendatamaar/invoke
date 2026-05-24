import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Info,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useStore } from "../../../store";
import { wsRequestKey } from "../../../store/slices/protocolSlice";
import { Select } from "../../../components/shared/Select";

type WsDirection = "sent" | "received" | "system";
type DirectionFilter = "all" | WsDirection;

function tryPrettyJson(body: string): string | null {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return null;
  }
}

function byteSize(str: string): number {
  return new TextEncoder().encode(str).length;
}

export function WebSocketLogPanel() {
  const { wsSessionsByRequestId, activeWsSessionIdByRequestId, request, setWsSession } = useStore();

  const wsKey = wsRequestKey(request.id);
  const wsSessions = wsSessionsByRequestId[wsKey] ?? [];
  const activeWsSessionId = activeWsSessionIdByRequestId[wsKey] ?? wsSessions[0]?.id ?? "";

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
    if (dirFilter !== "all")
      entries = entries.filter((e) => e.direction === dirFilter);
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
      if (e.key === "Escape" && search) {
        setSearch("");
      }
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
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const websocketState = activeSession?.state ?? "disconnected";

  return (
    <div className="flex flex-col h-full">
      {/* Log toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-1 flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-0.5">
          <Search size={10} className="text-[var(--text-3)] shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="bg-transparent text-2xs text-[var(--text-1)] placeholder-[var(--text-3)] outline-none w-full"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-[var(--text-3)] hover:text-[var(--text-1)]"
            >
              <X size={10} />
            </button>
          )}
        </div>

        <Select
          value={dirFilter}
          onChange={(e) => setDirFilter(e.target.value as DirectionFilter)}
          size="2xs"
        >
          <option value="all">All</option>
          <option value="sent">Sent</option>
          <option value="received">Received</option>
          <option value="system">System</option>
        </Select>

        <button
          onClick={() => setPrettyJson((v) => !v)}
          title="Toggle JSON pretty-print"
          className={`p-1 rounded ${prettyJson ? "text-[var(--accent)] bg-[var(--accent-muted,#dbeafe)]" : "text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
        >
          <FileText size={13} />
        </button>

        <button
          onClick={copyAll}
          title="Copy all"
          className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] rounded"
        >
          <Copy size={13} />
        </button>

        <button
          onClick={clearLog}
          title="Clear log"
          className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] rounded"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Message log */}
      <div className="flex-1 overflow-y-auto font-mono text-2xs p-2 flex flex-col gap-1">
        {filteredLog.map((entry) => {
          const displayBody = prettyJson
            ? (tryPrettyJson(entry.body) ?? entry.body)
            : entry.body;
          const expanded = expandedIds.has(entry.id);
          return (
            <div
              key={entry.id}
              className={`rounded ${
                entry.direction === "sent"
                  ? "bg-[var(--info-bg)]"
                  : entry.direction === "system"
                    ? "bg-[var(--warn-bg)]"
                    : "bg-[var(--surface-2)]"
              }`}
            >
              <div className="flex items-start gap-2 p-1.5">
                <button
                  onClick={() => toggleExpanded(entry.id)}
                  className="mt-0.5 shrink-0 text-[var(--text-3)] hover:text-[var(--text-1)]"
                >
                  {expanded ? (
                    <ChevronDown size={10} />
                  ) : (
                    <ChevronRight size={10} />
                  )}
                </button>
                {entry.direction === "sent" ? (
                  <ArrowUp
                    size={11}
                    className="text-[var(--info)] mt-0.5 shrink-0"
                  />
                ) : entry.direction === "system" ? (
                  <Info
                    size={11}
                    className="text-[var(--warn)] mt-0.5 shrink-0"
                  />
                ) : (
                  <ArrowDown
                    size={11}
                    className="text-[var(--ok)] mt-0.5 shrink-0"
                  />
                )}
                <pre className="flex-1 break-all whitespace-pre-wrap text-[var(--text-1)] font-mono">
                  {displayBody}
                </pre>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {entry.type === "binary" && (
                    <span className="text-[8px] uppercase text-[var(--text-3)] bg-[var(--surface-3,#e5e7eb)] rounded px-1">
                      bin
                    </span>
                  )}
                  <span className="text-[var(--text-3)]">
                    {new Date(entry.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              {expanded && (
                <div className="px-7 pb-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-[var(--text-3)] border-t border-[var(--border)]">
                  <span>
                    type:{" "}
                    <span className="text-[var(--text-2)]">{entry.type}</span>
                  </span>
                  <span>
                    direction:{" "}
                    <span className="text-[var(--text-2)]">
                      {entry.direction}
                    </span>
                  </span>
                  <span>
                    size:{" "}
                    <span className="text-[var(--text-2)]">
                      {byteSize(entry.body)} B
                    </span>
                  </span>
                  <span>
                    timestamp:{" "}
                    <span className="text-[var(--text-2)]">
                      {new Date(entry.createdAt).toISOString()}
                    </span>
                  </span>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(entry.body).catch(() => {})
                    }
                    className="flex items-center gap-0.5 hover:text-[var(--text-1)] transition-colors"
                  >
                    <Copy size={9} /> copy
                  </button>
                  <button
                    onClick={() => toggleDiffSelect(entry.id)}
                    className={`flex items-center gap-0.5 transition-colors ${
                      diffSelected.includes(entry.id)
                        ? "text-[var(--accent)]"
                        : "hover:text-[var(--text-1)]"
                    }`}
                  >
                    <ArrowLeftRight size={9} />
                    {diffSelected.includes(entry.id) ? "deselect" : "diff"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!filteredLog.length && (
          <p className="text-[var(--text-3)] text-center mt-8 text-2xs">
            {search || dirFilter !== "all"
              ? "No matching messages"
              : websocketState === "disconnected"
                ? "Not connected"
                : "No messages"}
          </p>
        )}
      </div>

      {/* Diff selection bar */}
      {diffSelected.length > 0 && (
        <div className="border-t border-[var(--border)] px-3 py-1.5 flex items-center gap-2 shrink-0 bg-[var(--surface-2)]">
          <ArrowLeftRight
            size={11}
            className="text-[var(--accent)] shrink-0"
          />
          <span className="text-2xs text-[var(--text-2)] flex-1">
            {diffSelected.length === 1
              ? "Select one more frame to diff"
              : "2 frames selected"}
          </span>
          {diffSelected.length === 2 && (
            <button
              onClick={() => setShowDiff(true)}
              className="btn btn-primary text-2xs px-2"
            >
              Open diff
            </button>
          )}
          <button
            onClick={() => {
              setDiffSelected([]);
              setShowDiff(false);
            }}
            className="p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Inline diff panel */}
      {showDiff &&
        diffSelected.length === 2 &&
        (() => {
          const allLog = activeSession?.log ?? [];
          const left = allLog.find((e) => e.id === diffSelected[0]);
          const right = allLog.find((e) => e.id === diffSelected[1]);
          const leftBody = left
            ? (tryPrettyJson(left.body) ?? left.body)
            : "";
          const rightBody = right
            ? (tryPrettyJson(right.body) ?? right.body)
            : "";
          return (
            <div
              className="border-t border-[var(--border)] shrink-0 flex flex-col"
              style={{ maxHeight: "45%" }}
            >
              <div className="flex items-center justify-between px-3 py-1 bg-[var(--surface-2)] border-b border-[var(--border)] shrink-0">
                <span className="text-2xs font-medium text-[var(--text-2)]">
                  Frame diff
                </span>
                <button
                  onClick={() => setShowDiff(false)}
                  className="text-[var(--text-3)] hover:text-[var(--text-1)]"
                >
                  <X size={11} />
                </button>
              </div>
              <div className="flex overflow-hidden flex-1 min-h-0">
                <div className="flex-1 overflow-auto p-2 border-r border-[var(--border)]">
                  <div className="text-[10px] text-[var(--text-3)] mb-1">
                    Frame A · {left?.direction} ·{" "}
                    {new Date(left?.createdAt ?? 0).toLocaleTimeString()}
                  </div>
                  <pre className="text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all">
                    {leftBody}
                  </pre>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  <div className="text-[10px] text-[var(--text-3)] mb-1">
                    Frame B · {right?.direction} ·{" "}
                    {new Date(right?.createdAt ?? 0).toLocaleTimeString()}
                  </div>
                  <pre className="text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all">
                    {rightBody}
                  </pre>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
