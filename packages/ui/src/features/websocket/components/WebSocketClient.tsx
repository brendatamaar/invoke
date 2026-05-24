import { useRef, useState } from "react";
import {
  AlertTriangle,
  Binary,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { WsSavedMessage } from "@invoke/core";
import { useStore } from "../../../store";
import { wsRequestKey } from "../../../store/slices/protocolSlice";
import { webSocketSend } from "../api";
import { Select } from "../../../components/shared/Select";
import { VariableAutocompleteInput } from "../../../components/shared/VariableAutocompleteInput";

type InnerTab = "messages" | "headers" | "auth" | "options";

interface MsgTemplate {
  label: string;
  body: string;
  type: "text" | "binary";
}

const PROTOCOL_TEMPLATES: Record<string, MsgTemplate[]> = {
  "graphql-transport-ws": [
    {
      label: "connection_init",
      body: '{"type":"connection_init"}',
      type: "text",
    },
    {
      label: "subscribe",
      body: JSON.stringify(
        {
          type: "subscribe",
          id: "sub_1",
          payload: { query: "subscription { ... }", variables: {} },
        },
        null,
        2,
      ),
      type: "text",
    },
    {
      label: "complete",
      body: '{"type":"complete","id":"sub_1"}',
      type: "text",
    },
    { label: "ping", body: '{"type":"ping"}', type: "text" },
  ],
  MQTT: [
    {
      label: "CONNECT",
      body: JSON.stringify(
        { type: "CONNECT", clientId: "invoke-client", keepAlive: 60 },
        null,
        2,
      ),
      type: "text",
    },
    {
      label: "PUBLISH",
      body: JSON.stringify(
        { type: "PUBLISH", topic: "test/topic", payload: "hello" },
        null,
        2,
      ),
      type: "text",
    },
    {
      label: "SUBSCRIBE",
      body: JSON.stringify({ type: "SUBSCRIBE", topics: ["test/#"] }, null, 2),
      type: "text",
    },
  ],
  STOMP: [
    {
      label: "CONNECT",
      body: "CONNECT\naccept-version:1.2\nheart-beat:0,0\n\n\0",
      type: "text",
    },
    {
      label: "SEND",
      body: 'SEND\ndestination:/topic/test\ncontent-type:application/json\n\n{"message":"hello"}\0',
      type: "text",
    },
    {
      label: "SUBSCRIBE",
      body: "SUBSCRIBE\nid:sub-0\ndestination:/topic/test\n\n\0",
      type: "text",
    },
  ],
  "Socket.IO": [
    { label: "Handshake (EIO4)", body: "40", type: "text" },
    { label: "Emit event", body: '42["event","payload"]', type: "text" },
    { label: "Ping", body: "2", type: "text" },
  ],
};

const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
]);

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
        <div className="grid grid-cols-[4px_14px_8px_1fr_1px_1fr_24px_24px] items-center text-2xs text-[var(--text-3)] py-1 border-b border-[var(--border)]">
          <span />
          <span />
          <span />
          <span>Key</span>
          <span />
          <span className="pl-2">Value</span>
          <span />
          <span />
        </div>
      )}
      {rows.map((row, i) => {
        const isSensitive = SENSITIVE_KEYS.has(row.key.toLowerCase());
        const isRevealed = revealed.has(i);
        return (
          <div
            key={i}
            className="group grid grid-cols-[4px_14px_8px_1fr_1px_1fr_24px_24px] items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
          >
            <span />
            <input
              type="checkbox"
              checked={row.enabled !== false}
              onChange={(e) => update(i, "enabled", e.target.checked)}
              className="w-3.5 h-3.5"
            />
            <span />
            <input
              type="text"
              value={row.key}
              onChange={(e) => update(i, "key", e.target.value)}
              placeholder="Header"
              className="w-full bg-transparent border-0 outline-none py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
            />
            <span className="h-4 bg-[var(--border)]" />
            <input
              type={isSensitive && !isRevealed ? "password" : "text"}
              value={row.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="Value"
              className="w-full bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
            />
            <button
              onClick={() => toggleReveal(i)}
              title={isRevealed ? "Hide value" : "Reveal value"}
              className={`w-6 flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] ${!isSensitive ? "invisible" : ""}`}
            >
              {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
            <button
              onClick={() => remove(i)}
              className="w-6 flex items-center justify-center text-[var(--text-3)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100"
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

function normalizeJsonBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body));
  } catch {
    return body;
  }
}

function resolveDynamicVars(text: string): string {
  return text
    .replace(/\{\{\$timestamp\}\}/g, String(Date.now()))
    .replace(/\{\{\$isoTimestamp\}\}/g, new Date().toISOString())
    .replace(/\{\{\$randomUUID\}\}/g, crypto.randomUUID())
    .replace(
      /\{\{\$randomInt\}\}/g,
      String(Math.floor(Math.random() * 1_000_000)),
    );
}

export function WebSocketClient() {
  const {
    wsSessionsByRequestId,
    activeWsSessionIdByRequestId,
    request,
    setWsSession,
    addWsSession,
    closeWsSession,
    set,
    addToast,
    websocketRequest,
    setWebsocketRequest,
  } = useStore();

  const wsKey = wsRequestKey(request.id);
  const wsSessions = wsSessionsByRequestId[wsKey] ?? [];
  const activeWsSessionId = activeWsSessionIdByRequestId[wsKey] ?? wsSessions[0]?.id ?? "";

  const activeSession =
    wsSessions.find((s) => s.id === activeWsSessionId) ?? wsSessions[0];

  const [showTemplates, setShowTemplates] = useState(false);
  const [innerTab, setInnerTab] = useState<InnerTab>("messages");
  const [expandedSaved, setExpandedSaved] = useState<string | null>(null);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [selectedSaved, setSelectedSaved] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    label: string;
    body: string;
    type: "text" | "binary";
    autoSend: boolean;
  } | null>(null);

  // Composer state
  const [message, setMessage] = useState("");
  const [binaryMode, setBinaryMode] = useState(false);
  const subIdRef = useRef(0);
  const [gqlSubscribed, setGqlSubscribed] = useState(false);
  const [currentSubId, setCurrentSubId] = useState("sub_1");

  const websocketState = activeSession?.state ?? "disconnected";
  const auth = websocketRequest.auth ?? { type: "none" };
  const savedMessages = websocketRequest.savedMessages ?? [];
  const preset = websocketRequest.preset ?? "none";

  const send = async () => {
    if (!message.trim()) return;
    const body = resolveDynamicVars(message);
    const connectionId = activeSession?.connectionId ?? "";
    setMessage("");
    try {
      await webSocketSend(connectionId, body, binaryMode);
      setWsSession(activeSession.id, {
        log: [
          ...(activeSession?.log ?? []),
          {
            id: crypto.randomUUID(),
            direction: "sent" as const,
            type: binaryMode ? "binary" : "text",
            body: binaryMode ? body : normalizeJsonBody(body),
            createdAt: Date.now(),
          },
        ],
      });
    } catch (e) {
      setMessage(body);
      addToast("error", String(e));
    }
  };

  const sendGqlSubscribe = async () => {
    const connectionId = activeSession?.connectionId ?? "";
    const id = `sub_${++subIdRef.current}`;
    setCurrentSubId(id);
    let vars: unknown = {};
    try {
      vars = JSON.parse(websocketRequest.presetVariables ?? "{}");
    } catch {
      /* invalid JSON */
    }
    const frame = JSON.stringify({
      type: "subscribe",
      id,
      payload: { query: websocketRequest.presetQuery ?? "", variables: vars },
    });
    setGqlSubscribed(true);
    try {
      await webSocketSend(connectionId, frame);
      setWsSession(activeSession.id, {
        log: [
          ...(activeSession?.log ?? []),
          {
            id: crypto.randomUUID(),
            direction: "sent" as const,
            type: "text",
            body: frame,
            createdAt: Date.now(),
          },
        ],
      });
    } catch (e) {
      setGqlSubscribed(false);
      addToast("error", String(e));
    }
  };

  const sendGqlUnsubscribe = async () => {
    const connectionId = activeSession?.connectionId ?? "";
    const frame = JSON.stringify({ type: "complete", id: currentSubId });
    setGqlSubscribed(false);
    try {
      await webSocketSend(connectionId, frame);
      setWsSession(activeSession.id, {
        log: [
          ...(activeSession?.log ?? []),
          {
            id: crypto.randomUUID(),
            direction: "sent" as const,
            type: "text",
            body: frame,
            createdAt: Date.now(),
          },
        ],
      });
    } catch (e) {
      setGqlSubscribed(true);
      addToast("error", String(e));
    }
  };

  // const sendSaved = async (msg: WsSavedMessage) => {
  //   const body = resolveDynamicVars(msg.body);
  //   const connectionId = activeSession?.connectionId ?? "";
  //   try {
  //     await webSocketSend(connectionId, body, msg.type === "binary");
  //     setWsSession(activeSession.id, {
  //       log: [
  //         ...(activeSession?.log ?? []),
  //         {
  //           id: crypto.randomUUID(),
  //           direction: "sent" as const,
  //           type: msg.type,
  //           body,
  //           createdAt: Date.now(),
  //         },
  //       ],
  //     });
  //   } catch (e) {
  //     addToast("error", String(e));
  //   }
  // };

  const addSavedMessage = () => {
    setWebsocketRequest({
      savedMessages: [
        ...savedMessages,
        {
          id: crypto.randomUUID(),
          label: "",
          body: "",
          type: "text",
          autoSend: false,
        },
      ],
    });
  };

  const addFromTemplate = (tpl: MsgTemplate) => {
    setWebsocketRequest({
      savedMessages: [
        ...savedMessages,
        {
          id: crypto.randomUUID(),
          label: tpl.label,
          body: tpl.body,
          type: tpl.type,
          autoSend: false,
        },
      ],
    });
    setShowTemplates(false);
  };

  const updateSavedMessage = (id: string, partial: Partial<WsSavedMessage>) => {
    setWebsocketRequest({
      savedMessages: savedMessages.map((m) =>
        m.id === id ? { ...m, ...partial } : m,
      ),
    });
  };

  const removeSavedMessage = (id: string) => {
    setWebsocketRequest({
      savedMessages: savedMessages.filter((m) => m.id !== id),
    });
  };

  const INNER_TABS: { id: InnerTab; label: string }[] = [
    { id: "messages", label: "Messages" },
    { id: "headers", label: "Headers" },
    { id: "auth", label: "Auth" },
    { id: "options", label: "Options" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Session tab strip */}
      <div className="flex items-center gap-0.5 px-2 pt-1.5 border-b border-[var(--border)] overflow-x-auto shrink-0">
        {wsSessions.map((sess) => (
          <div
            key={sess.id}
            onClick={() => set((s) => ({ activeWsSessionIdByRequestId: { ...s.activeWsSessionIdByRequestId, [wsKey]: sess.id } }))}
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

      {/* Messages tab — composer + saved messages */}
      {innerTab === "messages" && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Composer */}
          <div className="p-2 flex flex-col gap-2 border-b border-[var(--border)]">
            {preset === "graphql-transport-ws" ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1 text-2xs text-[var(--text-3)] font-medium uppercase tracking-wide">
                  graphql-transport-ws
                </div>
                <textarea
                  value={websocketRequest.presetQuery ?? ""}
                  onChange={(e) =>
                    setWebsocketRequest({ presetQuery: e.target.value })
                  }
                  placeholder="subscription { ... }"
                  rows={3}
                  className="input text-xs font-mono resize-none py-1.5"
                />
                <textarea
                  value={websocketRequest.presetVariables ?? "{}"}
                  onChange={(e) =>
                    setWebsocketRequest({ presetVariables: e.target.value })
                  }
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
                    placeholder={
                      binaryMode ? "Base64-encoded bytes…" : "Message…"
                    }
                    disabled={websocketState !== "connected"}
                    rows={3}
                    className="input text-xs font-mono flex-1 resize-none py-1.5"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={send}
                    disabled={websocketState !== "connected"}
                    className="btn btn-primary text-xs px-4"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setShowSavedModal(true)}
                    className="btn text-xs gap-1"
                  >
                    <Plus size={11} /> Saved Messages
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Saved messages modal */}
      {showSavedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowSavedModal(false);
              setShowTemplates(false);
            }
          }}
        >
          <div
            className="flex flex-col max-h-[70vh] w-[480px]"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-3)",
              boxShadow: "var(--shadow-pop)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between shrink-0"
              style={{ padding: "10px 14px", borderBottom: "1px solid var(--line-1)" }}
            >
              <span style={{ fontSize: "var(--t-base)", fontWeight: 600, color: "var(--fg-0)" }}>
                Saved Messages
              </span>
              <div className="flex items-center gap-1">
                <button onClick={addSavedMessage} className="btn text-2xs px-2 gap-1">
                  <Plus size={11} /> Add
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowTemplates((v) => !v)}
                    className="btn text-2xs px-2 gap-1"
                  >
                    From template <ChevronDown size={10} />
                  </button>
                  {showTemplates && (
                    <div
                      className="absolute right-0 top-full mt-1 z-50 min-w-48 overflow-y-auto"
                      style={{
                        background: "var(--bg-2)",
                        border: "1px solid var(--line-2)",
                        borderRadius: "var(--r-2)",
                        boxShadow: "var(--shadow-pop)",
                        maxHeight: "min(280px, 50vh)",
                      }}
                    >
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
                <button
                  onClick={() => { setShowSavedModal(false); setShowTemplates(false); }}
                  className="p-1 rounded ml-1"
                  style={{ color: "var(--fg-3)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-0)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-3)")}
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2" style={{ padding: "12px 14px" }}>
              {savedMessages.map((msg) => {
                const isSelected = selectedSaved === msg.id;
                const isExpanded = expandedSaved === msg.id;
                const preview = msg.label || msg.body.slice(0, 52) + (msg.body.length > 52 ? "…" : "");
                return (
                  <div
                    key={msg.id}
                    style={{
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--line-2)"}`,
                      borderRadius: "var(--r-2)",
                    }}
                  >
                    <div
                      className="flex items-center gap-2 px-3 py-2 group cursor-pointer hover:bg-[var(--surface-2)]"
                      onClick={() => setSelectedSaved(isSelected ? null : msg.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSelectedSaved(isSelected ? null : msg.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 shrink-0 cursor-pointer"
                      />
                      <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate">
                        {preview || <span className="text-[var(--text-3)]">Untitled</span>}
                      </span>
                      {msg.type === "binary" && (
                        <span className="text-[10px] text-[var(--text-3)] shrink-0">bin</span>
                      )}
                      {msg.autoSend && (
                        <span className="text-[10px] text-[var(--accent)] shrink-0">auto-send</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isExpanded) {
                            setExpandedSaved(null);
                            setEditDraft(null);
                          } else {
                            setExpandedSaved(msg.id);
                            setEditDraft({
                              label: msg.label,
                              body: msg.body,
                              type: msg.type,
                              autoSend: msg.autoSend,
                            });
                          }
                        }}
                        className={`p-0.5 rounded shrink-0 ${isExpanded ? "text-[var(--accent)]" : "text-[var(--text-3)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-1)]"}`}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedSaved === msg.id) setSelectedSaved(null);
                          removeSavedMessage(msg.id);
                        }}
                        className="p-0.5 rounded shrink-0 text-[var(--text-3)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)]"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {isExpanded && editDraft && (
                      <div
                        className="flex flex-col gap-1.5 p-3"
                        style={{ borderTop: "1px solid var(--line-1)", background: "var(--bg-1)" }}
                      >
                        <input
                          value={editDraft.label}
                          onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })}
                          placeholder="Label (optional)"
                          className="input text-xs"
                        />
                        <textarea
                          value={editDraft.body}
                          onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })}
                          placeholder="Message body…"
                          rows={3}
                          className="input text-xs font-mono resize-none py-1.5"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editDraft.autoSend}
                              onChange={(e) => setEditDraft({ ...editDraft, autoSend: e.target.checked })}
                            />
                            Auto-send on connect
                          </label>
                          <Select
                            value={editDraft.type}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, type: e.target.value as "text" | "binary" })
                            }
                            size="xs"
                          >
                            <option value="text">Text</option>
                            <option value="binary">Binary</option>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn text-xs px-3"
                            onClick={() => {
                              setExpandedSaved(null);
                              setEditDraft(null);
                            }}
                          >
                            Discard
                          </button>
                          <button
                            className="btn btn-primary text-xs px-3"
                            onClick={() => {
                              updateSavedMessage(msg.id, editDraft);
                              setExpandedSaved(null);
                              setEditDraft(null);
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {savedMessages.length === 0 && (
                <p className="text-2xs text-[var(--text-3)] text-center mt-6">
                  No saved messages yet
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-2 shrink-0"
              style={{ padding: "10px 14px", borderTop: "1px solid var(--line-1)", background: "var(--bg-1)" }}
            >
              <button
                className="btn"
                onClick={() => { setShowSavedModal(false); setShowTemplates(false); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!selectedSaved}
                onClick={() => {
                  const msg = savedMessages.find((m) => m.id === selectedSaved);
                  if (msg) {
                    setMessage(msg.body);
                    setBinaryMode(msg.type === "binary");
                  }
                  setShowSavedModal(false);
                  setSelectedSaved(null);
                }}
              >
                Load
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Headers tab */}
      {innerTab === "headers" && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {websocketRequest.headers.some((h) =>
            /^(authorization|cookie|set-cookie)$/i.test(h.key),
          ) && (
            <div className="flex items-start gap-2 px-3 py-2 bg-[var(--warn-bg)] border-b border-[var(--border)] text-2xs text-[var(--warn)] shrink-0">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" />
              <span>
                Sensitive headers (Authorization, Cookie) are sent as plaintext
                handshake headers. Use the Auth tab for credentials instead.
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
            <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
              Type
            </label>
            <Select
              value={auth.type}
              onChange={(e) =>
                setWebsocketRequest({
                  auth: { type: e.target.value as typeof auth.type },
                })
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
              <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
                Token
              </label>
              <VariableAutocompleteInput
                value={auth.token ?? ""}
                onChange={(v) =>
                  setWebsocketRequest({ auth: { ...auth, token: v } })
                }
                placeholder="{{token}}"
                className="input text-xs flex-1"
              />
            </div>
          )}

          {auth.type === "basic" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
                  Username
                </label>
                <VariableAutocompleteInput
                  value={auth.username ?? ""}
                  onChange={(v) =>
                    setWebsocketRequest({ auth: { ...auth, username: v } })
                  }
                  className="input text-xs flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
                  Password
                </label>
                <input
                  type="password"
                  value={auth.password ?? ""}
                  onChange={(e) =>
                    setWebsocketRequest({
                      auth: { ...auth, password: e.target.value },
                    })
                  }
                  className="input text-xs flex-1"
                />
              </div>
            </>
          )}

          {auth.type === "api-key" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
                  Key
                </label>
                <VariableAutocompleteInput
                  value={auth.apiKeyName ?? ""}
                  onChange={(v) =>
                    setWebsocketRequest({ auth: { ...auth, apiKeyName: v } })
                  }
                  className="input text-xs flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-2)] w-20 shrink-0">
                  Value
                </label>
                <VariableAutocompleteInput
                  value={auth.apiKeyValue ?? ""}
                  onChange={(v) =>
                    setWebsocketRequest({ auth: { ...auth, apiKeyValue: v } })
                  }
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

      {/* Options tab */}
      {innerTab === "options" && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-28 shrink-0">
              Sub-protocols
            </label>
            <input
              value={websocketRequest.protocols ?? ""}
              onChange={(e) =>
                setWebsocketRequest({ protocols: e.target.value })
              }
              placeholder="chat, superchat"
              className="input text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-28 shrink-0">
              Origin header
            </label>
            <input
              value={websocketRequest.origin ?? ""}
              onChange={(e) => setWebsocketRequest({ origin: e.target.value })}
              placeholder="https://app.example.com"
              className="input text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-2)] w-28 shrink-0">
              Timeout (ms)
            </label>
            <input
              type="number"
              value={websocketRequest.timeoutMs ?? 30000}
              onChange={(e) =>
                setWebsocketRequest({ timeoutMs: Number(e.target.value) })
              }
              min={0}
              className="input text-xs w-28"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={websocketRequest.autoReconnect ?? false}
              onChange={(e) =>
                setWebsocketRequest({ autoReconnect: e.target.checked })
              }
            />
            <span className="text-xs text-[var(--text-2)]">
              Auto-reconnect on disconnect
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={websocketRequest.ndjsonMode ?? false}
              onChange={(e) =>
                setWebsocketRequest({ ndjsonMode: e.target.checked })
              }
            />
            <span className="text-xs text-[var(--text-2)]">
              NDJSON mode (split frames on newlines)
            </span>
          </label>
          <button
            type="button"
            onClick={() => set({ showSettings: true, settingsTab: "network" })}
            className="text-left text-2xs text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            TLS and certificate policy is in Settings &gt; Network.
          </button>
        </div>
      )}
    </div>
  );
}
