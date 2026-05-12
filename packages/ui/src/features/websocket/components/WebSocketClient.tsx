import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  Binary,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Info,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { WsSavedMessage } from "@invoke/core";
import { useStore } from "../../../store";
import { webSocketSend } from "../api";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";
import { Select } from "../../../components/shared/Select";
import { VariableAutocompleteInput } from "../../../components/shared/VariableAutocompleteInput";

type WsDirection = "sent" | "received" | "system";
type DirectionFilter = "all" | WsDirection;
type InnerTab = "log" | "headers" | "auth" | "messages" | "options";

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

function resolveDynamicVars(text: string): string {
  return text
    .replace(/\{\{\$timestamp\}\}/g, String(Date.now()))
    .replace(/\{\{\$isoTimestamp\}\}/g, new Date().toISOString())
    .replace(/\{\{\$randomUUID\}\}/g, crypto.randomUUID())
    .replace(/\{\{\$randomInt\}\}/g, String(Math.floor(Math.random() * 1_000_000)));
}

// ─── Protocol templates ──────────────────────────────────────────────────────

interface MsgTemplate {
  label: string;
  body: string;
  type: "text" | "binary";
}

const PROTOCOL_TEMPLATES: Record<string, MsgTemplate[]> = {
  "graphql-transport-ws": [
    { label: "connection_init", body: '{"type":"connection_init"}', type: "text" },
    {
      label: "subscribe",
      body: JSON.stringify({ type: "subscribe", id: "sub_1", payload: { query: "subscription { ... }", variables: {} } }, null, 2),
      type: "text",
    },
    { label: "complete", body: '{"type":"complete","id":"sub_1"}', type: "text" },
    { label: "ping", body: '{"type":"ping"}', type: "text" },
  ],
  MQTT: [
    { label: "CONNECT", body: JSON.stringify({ type: "CONNECT", clientId: "invoke-client", keepAlive: 60 }, null, 2), type: "text" },
    { label: "PUBLISH", body: JSON.stringify({ type: "PUBLISH", topic: "test/topic", payload: "hello" }, null, 2), type: "text" },
    { label: "SUBSCRIBE", body: JSON.stringify({ type: "SUBSCRIBE", topics: ["test/#"] }, null, 2), type: "text" },
  ],
  STOMP: [
    { label: "CONNECT", body: "CONNECT\naccept-version:1.2\nheart-beat:0,0\n\n\0", type: "text" },
    { label: "SEND", body: "SEND\ndestination:/topic/test\ncontent-type:application/json\n\n{\"message\":\"hello\"}\0", type: "text" },
    { label: "SUBSCRIBE", body: "SUBSCRIBE\nid:sub-0\ndestination:/topic/test\n\n\0", type: "text" },
  ],
  "Socket.IO": [
    { label: "Handshake (EIO4)", body: "40", type: "text" },
    { label: "Emit event", body: '42["event","payload"]', type: "text" },
    { label: "Ping", body: "2", type: "text" },
  ],
};

// ─── Sensitive key-value editor ──────────────────────────────────────────────

const SENSITIVE_KEYS = new Set(["authorization", "cookie", "set-cookie", "proxy-authorization"]);

function SensitiveKeyValueEditor({
  rows,
  onChange,
}: {
  rows: { key: string; value: string; enabled?: boolean }[];
  onChange: (rows: { key: string; value: string; enabled?: boolean }[]) => void;
}) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const update = (i: number, field: string, value: string | boolean) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { key: "", value: "", enabled: true }]);
  const toggleReveal = (i: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div className="flex flex-col">
      {rows.length > 0 && (
        <div className="flex items-center gap-0 text-2xs text-[var(--text-3)] px-2 py-1 border-b border-[var(--border)]">
          <span className="w-4 shrink-0 mr-1" />
          <span className="flex-1">Key</span>
          <span className="flex-1">Value</span>
          <span className="w-12 shrink-0" />
        </div>
      )}
      {rows.map((row, i) => {
        const isSensitive = SENSITIVE_KEYS.has(row.key.toLowerCase());
        const isRevealed = revealed.has(i);
        return (
          <div
            key={i}
            className="group flex items-center gap-0 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
          >
            <input
              type="checkbox"
              checked={row.enabled !== false}
              onChange={(e) => update(i, "enabled", e.target.checked)}
              className="w-3.5 h-3.5 mr-2 ml-1 accent-[var(--accent)] shrink-0"
            />
            <input
              type="text"
              value={row.key}
              onChange={(e) => update(i, "key", e.target.value)}
              placeholder="Header"
              className="flex-1 bg-transparent border-0 outline-none py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
            />
            <span className="w-px h-4 bg-[var(--border)] shrink-0" />
            <input
              type={isSensitive && !isRevealed ? "password" : "text"}
              value={row.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="Value"
              className="flex-1 bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
            />
            {isSensitive && (
              <button
                onClick={() => toggleReveal(i)}
                title={isRevealed ? "Hide value" : "Reveal value"}
                className="w-6 shrink-0 flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)]"
              >
                {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            )}
            <button
              onClick={() => remove(i)}
              className="w-6 shrink-0 flex items-center justify-center text-[var(--text-3)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={11} />
            </button>
          </div>
        );
      })}
      <button
        onClick={add}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] w-full text-left"
      >
        <Plus size={12} /> Add row
      </button>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WebSocketClient() {
  const {
    wsSessions,
    activeWsSessionId,
    setWsSession,
    addWsSession,
    closeWsSession,
    set,
    addToast,
    websocketRequest,
    setWebsocketRequest,
  } = useStore();

  const activeSession =
    wsSessions.find((s) => s.id === activeWsSessionId) ?? wsSessions[0];

  // Composer state
  const [message, setMessage] = useState("");
  const [binaryMode, setBinaryMode] = useState(false);

  // GraphQL preset composer state
  const subIdRef = useRef(0);
  const [gqlSubscribed, setGqlSubscribed] = useState(false);
  const [currentSubId, setCurrentSubId] = useState("sub_1");

  // Log toolbar state
  const [search, setSearch] = useState("");
  const [dirFilter, setDirFilter] = useState<DirectionFilter>("all");
  const [prettyJson, setPrettyJson] = useState(false);

  // Frame inspector: expanded entry ids
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Frame diff: up to 2 selected entries
  const [diffSelected, setDiffSelected] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  // Inner tab
  const [innerTab, setInnerTab] = useState<InnerTab>("log");

  // Template picker
  const [showTemplates, setShowTemplates] = useState(false);

  const filteredLog = useMemo(() => {
    let entries = activeSession?.log ?? [];
    if (dirFilter !== "all") entries = entries.filter((e) => e.direction === dirFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter((e) => e.body.toLowerCase().includes(q));
    }
    return entries;
  }, [activeSession?.log, dirFilter, search]);

  // Keyboard shortcuts: Ctrl+L clear log, Escape clear search
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
  }, [activeSession, search]);

  const toggleDiffSelect = (id: string) => {
    setDiffSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const send = async () => {
    if (!message.trim()) return;
    const body = resolveDynamicVars(message);
    const connectionId = activeSession?.connectionId ?? "";
    try {
      await webSocketSend(connectionId, body, binaryMode);
      setWsSession(activeSession.id, {
        log: [
          ...(activeSession?.log ?? []),
          {
            id: crypto.randomUUID(),
            direction: "sent" as const,
            type: binaryMode ? "binary" : "text",
            body,
            createdAt: Date.now(),
          },
        ],
      });
      setMessage("");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const sendGqlSubscribe = async () => {
    const connectionId = activeSession?.connectionId ?? "";
    const id = `sub_${++subIdRef.current}`;
    setCurrentSubId(id);
    let vars: unknown = {};
    try { vars = JSON.parse(websocketRequest.presetVariables ?? "{}"); } catch { /* invalid JSON */ }
    const frame = JSON.stringify({
      type: "subscribe",
      id,
      payload: { query: websocketRequest.presetQuery ?? "", variables: vars },
    });
    try {
      await webSocketSend(connectionId, frame);
      setGqlSubscribed(true);
      setWsSession(activeSession.id, {
        log: [
          ...(activeSession?.log ?? []),
          { id: crypto.randomUUID(), direction: "sent" as const, type: "text", body: frame, createdAt: Date.now() },
        ],
      });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const sendGqlUnsubscribe = async () => {
    const connectionId = activeSession?.connectionId ?? "";
    const frame = JSON.stringify({ type: "complete", id: currentSubId });
    try {
      await webSocketSend(connectionId, frame);
      setGqlSubscribed(false);
      setWsSession(activeSession.id, {
        log: [
          ...(activeSession?.log ?? []),
          { id: crypto.randomUUID(), direction: "sent" as const, type: "text", body: frame, createdAt: Date.now() },
        ],
      });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const sendSaved = async (msg: WsSavedMessage) => {
    const body = resolveDynamicVars(msg.body);
    const connectionId = activeSession?.connectionId ?? "";
    try {
      await webSocketSend(connectionId, body, msg.type === "binary");
      setWsSession(activeSession.id, {
        log: [
          ...(activeSession?.log ?? []),
          {
            id: crypto.randomUUID(),
            direction: "sent" as const,
            type: msg.type,
            body,
            createdAt: Date.now(),
          },
        ],
      });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const clearLog = () => setWsSession(activeSession.id, { log: [] });

  const copyAll = () => {
    const text = (activeSession?.log ?? [])
      .map((e) => `[${new Date(e.createdAt).toISOString()}] [${e.direction}] ${e.body}`)
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
  const auth = websocketRequest.auth ?? { type: "none" };
  const savedMessages = websocketRequest.savedMessages ?? [];
  const preset = websocketRequest.preset ?? "none";

  const addSavedMessage = () => {
    setWebsocketRequest({
      savedMessages: [
        ...savedMessages,
        { id: crypto.randomUUID(), label: "", body: "", type: "text", autoSend: false },
      ],
    });
  };

  const addFromTemplate = (tpl: MsgTemplate) => {
    setWebsocketRequest({
      savedMessages: [
        ...savedMessages,
        { id: crypto.randomUUID(), label: tpl.label, body: tpl.body, type: tpl.type, autoSend: false },
      ],
    });
    setShowTemplates(false);
  };

  const updateSavedMessage = (id: string, partial: Partial<WsSavedMessage>) => {
    setWebsocketRequest({
      savedMessages: savedMessages.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    });
  };

  const removeSavedMessage = (id: string) => {
    setWebsocketRequest({ savedMessages: savedMessages.filter((m) => m.id !== id) });
  };

  const INNER_TABS: { id: InnerTab; label: string }[] = [
    { id: "log", label: "Log" },
    { id: "headers", label: "Headers" },
    { id: "auth", label: "Auth" },
    { id: "messages", label: "Messages" },
    { id: "options", label: "Options" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Session tab strip */}
      <div className="flex items-center gap-0.5 px-2 pt-1.5 border-b border-[var(--border)] overflow-x-auto shrink-0">
        {wsSessions.map((sess) => (
          <div
            key={sess.id}
            onClick={() => set({ activeWsSessionId: sess.id })}
            className={`flex items-center gap-1 px-2 py-1 rounded-t text-2xs cursor-pointer select-none whitespace-nowrap ${
              sess.id === activeWsSessionId
                ? "bg-[var(--surface-2)] text-[var(--text-1)] border border-b-0 border-[var(--border)]"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                sess.state === "connected"
                  ? "bg-emerald-500"
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

      {/* Inner tab strip */}
      <div className="flex items-center border-b border-[var(--border)] shrink-0 px-2">
        {INNER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setInnerTab(tab.id)}
            className={`px-3 py-1.5 text-2xs border-b-2 transition-colors ${
              innerTab === tab.id
                ? "border-[var(--accent)] text-[var(--text-1)]"
                : "border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Log tab */}
      {innerTab === "log" && (
        <>
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

            <select
              value={dirFilter}
              onChange={(e) => setDirFilter(e.target.value as DirectionFilter)}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded px-1.5 py-0.5 text-2xs text-[var(--text-1)] outline-none cursor-pointer"
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="system">System</option>
            </select>

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
              const displayBody =
                prettyJson ? (tryPrettyJson(entry.body) ?? entry.body) : entry.body;
              const expanded = expandedIds.has(entry.id);
              return (
                <div
                  key={entry.id}
                  className={`rounded ${
                    entry.direction === "sent"
                      ? "bg-blue-50 dark:bg-blue-950/30"
                      : entry.direction === "system"
                        ? "bg-amber-50 dark:bg-amber-950/30"
                        : "bg-[var(--surface-2)]"
                  }`}
                >
                  {/* Main row */}
                  <div className="flex items-start gap-2 p-1.5">
                    <button
                      onClick={() => toggleExpanded(entry.id)}
                      className="mt-0.5 shrink-0 text-[var(--text-3)] hover:text-[var(--text-1)]"
                    >
                      {expanded
                        ? <ChevronDown size={10} />
                        : <ChevronRight size={10} />
                      }
                    </button>
                    {entry.direction === "sent" ? (
                      <ArrowUp size={11} className="text-blue-600 mt-0.5 shrink-0" />
                    ) : entry.direction === "system" ? (
                      <Info size={11} className="text-amber-600 mt-0.5 shrink-0" />
                    ) : (
                      <ArrowDown size={11} className="text-emerald-600 mt-0.5 shrink-0" />
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
                  {/* Frame inspector */}
                  {expanded && (
                    <div className="px-7 pb-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-[var(--text-3)] border-t border-[var(--border)]">
                      <span>type: <span className="text-[var(--text-2)]">{entry.type}</span></span>
                      <span>direction: <span className="text-[var(--text-2)]">{entry.direction}</span></span>
                      <span>size: <span className="text-[var(--text-2)]">{byteSize(entry.body)} B</span></span>
                      <span>timestamp: <span className="text-[var(--text-2)]">{new Date(entry.createdAt).toISOString()}</span></span>
                      <button
                        onClick={() => navigator.clipboard.writeText(entry.body).catch(() => {})}
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
                {search || dirFilter !== "all" ? "No matching messages" : "No messages"}
              </p>
            )}
          </div>

          {/* Diff selection bar */}
          {diffSelected.length > 0 && (
            <div className="border-t border-[var(--border)] px-3 py-1.5 flex items-center gap-2 shrink-0 bg-[var(--surface-2)]">
              <ArrowLeftRight size={11} className="text-[var(--accent)] shrink-0" />
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
                onClick={() => { setDiffSelected([]); setShowDiff(false); }}
                className="p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* Inline diff panel */}
          {showDiff && diffSelected.length === 2 && (() => {
            const allLog = activeSession?.log ?? [];
            const left = allLog.find((e) => e.id === diffSelected[0]);
            const right = allLog.find((e) => e.id === diffSelected[1]);
            const leftBody = left ? (tryPrettyJson(left.body) ?? left.body) : "";
            const rightBody = right ? (tryPrettyJson(right.body) ?? right.body) : "";
            return (
              <div className="border-t border-[var(--border)] shrink-0 flex flex-col" style={{ maxHeight: "45%" }}>
                <div className="flex items-center justify-between px-3 py-1 bg-[var(--surface-2)] border-b border-[var(--border)] shrink-0">
                  <span className="text-2xs font-medium text-[var(--text-2)]">Frame diff</span>
                  <button onClick={() => setShowDiff(false)} className="text-[var(--text-3)] hover:text-[var(--text-1)]">
                    <X size={11} />
                  </button>
                </div>
                <div className="flex overflow-hidden flex-1 min-h-0">
                  <div className="flex-1 overflow-auto p-2 border-r border-[var(--border)]">
                    <div className="text-[10px] text-[var(--text-3)] mb-1">
                      Frame A · {left?.direction} · {new Date(left?.createdAt ?? 0).toLocaleTimeString()}
                    </div>
                    <pre className="text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all">
                      {leftBody}
                    </pre>
                  </div>
                  <div className="flex-1 overflow-auto p-2">
                    <div className="text-[10px] text-[var(--text-3)] mb-1">
                      Frame B · {right?.direction} · {new Date(right?.createdAt ?? 0).toLocaleTimeString()}
                    </div>
                    <pre className="text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all">
                      {rightBody}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Composer */}
          <div className="border-t border-[var(--border)] p-2 flex flex-col gap-1.5 shrink-0">
            {preset === "graphql-transport-ws" ? (
              /* GraphQL subscribe composer */
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1 text-2xs text-[var(--text-3)] font-medium uppercase tracking-wide">
                  graphql-transport-ws
                </div>
                <textarea
                  value={websocketRequest.presetQuery ?? ""}
                  onChange={(e) => setWebsocketRequest({ presetQuery: e.target.value })}
                  placeholder="subscription { ... }"
                  rows={3}
                  className="input text-xs font-mono resize-none py-1.5"
                />
                <textarea
                  value={websocketRequest.presetVariables ?? "{}"}
                  onChange={(e) => setWebsocketRequest({ presetVariables: e.target.value })}
                  placeholder="{}"
                  rows={2}
                  className="input text-xs font-mono resize-none py-1.5"
                />
                <div className="flex gap-2">
                  <button
                    onClick={sendGqlSubscribe}
                    disabled={websocketState !== "connected" || gqlSubscribed}
                    className="btn btn-primary text-xs px-3"
                  >
                    Subscribe
                  </button>
                  <button
                    onClick={sendGqlUnsubscribe}
                    disabled={websocketState !== "connected" || !gqlSubscribed}
                    className="btn btn-danger text-xs px-3"
                  >
                    Unsubscribe
                  </button>
                </div>
              </div>
            ) : (
              /* Standard composer */
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBinaryMode(false)}
                    className={`flex items-center gap-1 text-2xs px-2 py-0.5 rounded ${!binaryMode ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
                  >
                    <FileText size={10} /> Text
                  </button>
                  <button
                    onClick={() => setBinaryMode(true)}
                    className={`flex items-center gap-1 text-2xs px-2 py-0.5 rounded ${binaryMode ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
                  >
                    <Binary size={10} /> Binary (base64)
                  </button>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={binaryMode ? "Base64-encoded bytes…" : "Message…"}
                    disabled={websocketState !== "connected"}
                    rows={2}
                    className="input text-xs font-mono flex-1 resize-none py-1.5"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <button
                    onClick={send}
                    disabled={websocketState !== "connected"}
                    className="btn btn-primary text-xs self-end px-3"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Headers tab */}
      {innerTab === "headers" && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {websocketRequest.headers.some((h) =>
            /^(authorization|cookie|set-cookie)$/i.test(h.key),
          ) && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-[var(--border)] text-2xs text-amber-700 dark:text-amber-400 shrink-0">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" />
              <span>
                Sensitive headers (Authorization, Cookie) are sent as plaintext handshake headers.
                Use the Auth tab for credentials instead.
              </span>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2">
            <SensitiveKeyValueEditor
              rows={websocketRequest.headers}
              onChange={(rows) => setWebsocketRequest({ headers: rows })}
            />
          </div>
        </div>
      )}

      {/* Auth tab */}
      {innerTab === "auth" && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-20 shrink-0">Type</label>
            <Select
              value={auth.type}
              onChange={(e) =>
                setWebsocketRequest({ auth: { type: e.target.value as typeof auth.type } })
              }
            >
              {["none", "bearer", "basic", "api-key"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          {auth.type === "bearer" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--text-2)] w-20 shrink-0">Token</label>
              <VariableAutocompleteInput
                value={auth.token ?? ""}
                onChange={(v) => setWebsocketRequest({ auth: { ...auth, token: v } })}
                placeholder="{{token}}"
                className="input text-xs flex-1"
              />
            </div>
          )}

          {auth.type === "basic" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-2)] w-20 shrink-0">Username</label>
                <VariableAutocompleteInput
                  value={auth.username ?? ""}
                  onChange={(v) => setWebsocketRequest({ auth: { ...auth, username: v } })}
                  className="input text-xs flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-2)] w-20 shrink-0">Password</label>
                <input
                  type="password"
                  value={auth.password ?? ""}
                  onChange={(e) =>
                    setWebsocketRequest({ auth: { ...auth, password: e.target.value } })
                  }
                  className="input text-xs flex-1"
                />
              </div>
            </>
          )}

          {auth.type === "api-key" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-2)] w-20 shrink-0">Key</label>
                <VariableAutocompleteInput
                  value={auth.apiKeyName ?? ""}
                  onChange={(v) => setWebsocketRequest({ auth: { ...auth, apiKeyName: v } })}
                  className="input text-xs flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-2)] w-20 shrink-0">Value</label>
                <VariableAutocompleteInput
                  value={auth.apiKeyValue ?? ""}
                  onChange={(v) => setWebsocketRequest({ auth: { ...auth, apiKeyValue: v } })}
                  className="input text-xs flex-1"
                />
              </div>
            </>
          )}

          {auth.type !== "none" && (
            <p className="text-2xs text-[var(--text-3)]">
              Applied as handshake headers on connect.
            </p>
          )}
        </div>
      )}

      {/* Messages tab */}
      {innerTab === "messages" && (
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
          {savedMessages.map((msg) => (
            <div
              key={msg.id}
              className="border border-[var(--border)] rounded p-2 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2">
                <input
                  value={msg.label}
                  onChange={(e) => updateSavedMessage(msg.id, { label: e.target.value })}
                  placeholder="Label (optional)"
                  className="input text-xs flex-1"
                />
                <select
                  value={msg.type}
                  onChange={(e) =>
                    updateSavedMessage(msg.id, { type: e.target.value as "text" | "binary" })
                  }
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded px-1.5 py-1 text-xs text-[var(--text-1)] outline-none cursor-pointer"
                >
                  <option value="text">Text</option>
                  <option value="binary">Binary</option>
                </select>
                <button
                  onClick={() => sendSaved(msg)}
                  disabled={websocketState !== "connected"}
                  className="btn btn-primary text-xs px-2"
                >
                  Send
                </button>
                <button
                  onClick={() => removeSavedMessage(msg.id)}
                  className="p-1 text-[var(--text-3)] hover:text-red-500 rounded"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <textarea
                value={msg.body}
                onChange={(e) => updateSavedMessage(msg.id, { body: e.target.value })}
                placeholder="Message body…"
                rows={2}
                className="input text-xs font-mono resize-none py-1.5"
              />
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={msg.autoSend}
                  onChange={(e) => updateSavedMessage(msg.id, { autoSend: e.target.checked })}
                  className="accent-[var(--accent)]"
                />
                Auto-send on connect
              </label>
            </div>
          ))}

          {/* Add buttons */}
          <div className="flex items-center gap-2">
            <button onClick={addSavedMessage} className="btn text-xs gap-1">
              <Plus size={12} /> Add Message
            </button>
            <div className="relative">
              <button
                onClick={() => setShowTemplates((v) => !v)}
                className="btn text-xs gap-1"
              >
                From template <ChevronDown size={11} />
              </button>
              {showTemplates && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-[var(--surface-1)] border border-[var(--border)] rounded shadow-lg min-w-48">
                  {Object.entries(PROTOCOL_TEMPLATES).map(([group, templates]) => (
                    <div key={group}>
                      <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide border-b border-[var(--border)]">
                        {group}
                      </div>
                      {templates.map((tpl) => (
                        <button
                          key={tpl.label}
                          onClick={() => addFromTemplate(tpl)}
                          className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Options tab */}
      {innerTab === "options" && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-28 shrink-0">Sub-protocols</label>
            <input
              value={websocketRequest.protocols ?? ""}
              onChange={(e) => setWebsocketRequest({ protocols: e.target.value })}
              placeholder="chat, superchat"
              className="input text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-28 shrink-0">Origin header</label>
            <input
              value={websocketRequest.origin ?? ""}
              onChange={(e) => setWebsocketRequest({ origin: e.target.value })}
              placeholder="https://app.example.com"
              className="input text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-28 shrink-0">Timeout (ms)</label>
            <input
              type="number"
              value={websocketRequest.timeoutMs ?? 30000}
              onChange={(e) => setWebsocketRequest({ timeoutMs: Number(e.target.value) })}
              min={0}
              className="input text-xs w-28"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={websocketRequest.autoReconnect ?? false}
              onChange={(e) => setWebsocketRequest({ autoReconnect: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <span className="text-xs text-[var(--text-2)]">Auto-reconnect on disconnect</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={websocketRequest.ndjsonMode ?? false}
              onChange={(e) => setWebsocketRequest({ ndjsonMode: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            <span className="text-xs text-[var(--text-2)]">NDJSON mode (split frames on newlines)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={websocketRequest.options?.verifySsl ?? true}
              onChange={(e) =>
                setWebsocketRequest({
                  options: { ...websocketRequest.options, verifySsl: e.target.checked },
                })
              }
              className="accent-[var(--accent)]"
            />
            <span className="text-xs text-[var(--text-2)]">Verify SSL certificate</span>
          </label>

          {/* TLS client certificate */}
          <div className="border-t border-[var(--border)] pt-3">
            <p className="text-xs font-medium text-[var(--text-2)] mb-2">TLS Client Certificate</p>
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-2xs text-[var(--text-3)] mb-1 block">CA Certificate (PEM)</label>
                <textarea
                  value={websocketRequest.options?.tlsClientConfig?.caCertPem ?? ""}
                  onChange={(e) =>
                    setWebsocketRequest({
                      options: {
                        ...websocketRequest.options,
                        tlsClientConfig: {
                          ...websocketRequest.options?.tlsClientConfig,
                          caCertPem: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="-----BEGIN CERTIFICATE-----"
                  rows={3}
                  className="input text-2xs font-mono resize-none py-1.5 w-full"
                />
              </div>
              <div>
                <label className="text-2xs text-[var(--text-3)] mb-1 block">Client Certificate (PEM)</label>
                <textarea
                  value={websocketRequest.options?.tlsClientConfig?.clientCertPem ?? ""}
                  onChange={(e) =>
                    setWebsocketRequest({
                      options: {
                        ...websocketRequest.options,
                        tlsClientConfig: {
                          ...websocketRequest.options?.tlsClientConfig,
                          clientCertPem: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="-----BEGIN CERTIFICATE-----"
                  rows={3}
                  className="input text-2xs font-mono resize-none py-1.5 w-full"
                />
              </div>
              <div>
                <label className="text-2xs text-[var(--text-3)] mb-1 block">Client Key (PEM)</label>
                <textarea
                  value={websocketRequest.options?.tlsClientConfig?.clientKeyPem ?? ""}
                  onChange={(e) =>
                    setWebsocketRequest({
                      options: {
                        ...websocketRequest.options,
                        tlsClientConfig: {
                          ...websocketRequest.options?.tlsClientConfig,
                          clientKeyPem: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="-----BEGIN PRIVATE KEY-----"
                  rows={3}
                  className="input text-2xs font-mono resize-none py-1.5 w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-2xs text-[var(--text-3)] shrink-0">Server Name (SNI)</label>
                <input
                  value={websocketRequest.options?.tlsClientConfig?.serverName ?? ""}
                  onChange={(e) =>
                    setWebsocketRequest({
                      options: {
                        ...websocketRequest.options,
                        tlsClientConfig: {
                          ...websocketRequest.options?.tlsClientConfig,
                          serverName: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="override.example.com"
                  className="input text-xs flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
