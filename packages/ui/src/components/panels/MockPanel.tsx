import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, Trash2, X, Copy, ChevronDown, ChevronRight } from "lucide-react";
import { useStore } from "../../store";
import {
  loadMockRoutes,
  syncMockRoutes,
  clearMockLogs,
  loadWebhookLogs,
  clearWebhookLogs,
  type WebhookEntry,
} from "../../lib/api";
import { MethodBadge } from "../shared/MethodBadge";
import { KeyValueEditor } from "../shared/KeyValueEditor";
import { Select } from "../shared/Select";
import { ConfirmModal } from "../shared/ConfirmModal";
import { validateMockRoutes, type MockRoute, type MockSequenceItem } from "@invoke/core";

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

function makeRoute(): MockRoute {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    method: "GET",
    pathPattern: "/",
    status: 200,
    headers: [],
    body: "",
    latencyMs: 0,
  };
}

type RouteTab = "response" | "sequences" | "headers";

function makeSequenceItem(): MockSequenceItem {
  return { status: 200, headers: [], body: "" };
}

function RouteModal({
  route,
  onSave,
  onClose,
}: {
  route: MockRoute;
  onSave: (r: MockRoute) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MockRoute>({ ...route });
  const [tab, setTab] = useState<RouteTab>("response");

  const set = <K extends keyof MockRoute>(key: K, value: MockRoute[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const sequences = draft.sequences ?? [];
  const updateSeq = (i: number, patch: Partial<MockSequenceItem>) =>
    set("sequences", sequences.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSeq = () => set("sequences", [...sequences, makeSequenceItem()]);
  const removeSeq = (i: number) =>
    set("sequences", sequences.filter((_, idx) => idx !== i));

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 620, maxHeight: "84vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] shrink-0">
          <span className="text-sm font-semibold text-[var(--text-1)] flex-1">
            {route.id && route.pathPattern !== "/" ? "Edit Route" : "New Route"}
          </span>
          <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={draft.enabled !== false}
              onChange={(e) => set("enabled", e.target.checked)}
            />
            Enabled
          </label>
          <button
            onClick={onClose}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded hover:bg-[var(--surface-2)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Endpoint row */}
        <div className="px-5 pt-4 pb-3 flex flex-col gap-1.5 shrink-0 border-b border-[var(--border)]">
          <label className="text-xs font-medium text-[var(--text-2)]">Endpoint</label>
          <div className="flex gap-2">
            <Select
              value={draft.method}
              onChange={(v) => set("method", v as unknown as MockRoute["method"])}
              size="sm"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
            <input
              className="input text-xs py-1.5 flex-1"
              placeholder="/api/users"
              value={draft.pathPattern}
              onChange={(e) => set("pathPattern", e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-5 border-b border-[var(--border)] shrink-0">
          {(["response", "sequences", "headers"] as RouteTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs capitalize border-b-2 -mb-px transition-colors ${tab === t ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
            >
              {t}
              {t === "sequences" && sequences.length > 0 && (
                <span className="ml-1 text-2xs bg-[var(--accent-subtle)] text-[var(--accent)] rounded px-1">{sequences.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {tab === "response" && (
            <>
              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--text-2)]">Status code</label>
                  <input
                    type="number"
                    className="input text-sm py-1.5 w-28"
                    min={100}
                    max={599}
                    value={draft.status}
                    onChange={(e) => set("status", Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--text-2)]">Latency</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="input text-sm py-1.5 w-28"
                      min={0}
                      placeholder="0"
                      value={draft.latencyMs ?? ""}
                      onChange={(e) =>
                        set("latencyMs", e.target.value ? Number(e.target.value) : undefined)
                      }
                    />
                    <span className="text-sm text-[var(--text-3)]">ms</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-2)]">Response body</label>
                <textarea
                  className="input text-sm py-2 font-mono resize-none"
                  rows={8}
                  placeholder='{"message": "ok"}'
                  value={draft.body}
                  onChange={(e) => set("body", e.target.value)}
                />
              </div>
              {sequences.length > 0 && (
                <p className="text-2xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
                  Sequences are active — this default response is overridden. Switch to Sequences tab to manage.
                </p>
              )}
            </>
          )}

          {tab === "sequences" && (
            <>
              <p className="text-xs text-[var(--text-3)]">
                When sequences are set, each call to this route returns the next item in order, wrapping around. Overrides the default response.
              </p>
              {sequences.map((seq, i) => (
                <div key={i} className="border border-[var(--border)] rounded-lg p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-2)]">Response {i + 1}</span>
                    <button
                      onClick={() => removeSeq(i)}
                      className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-2xs text-[var(--text-3)]">Status</label>
                      <input
                        type="number"
                        className="input text-xs py-1 w-20"
                        min={100}
                        max={599}
                        value={seq.status}
                        onChange={(e) => updateSeq(i, { status: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-2xs text-[var(--text-3)]">Latency</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          className="input text-xs py-1 w-20"
                          min={0}
                          placeholder="0"
                          value={seq.latencyMs ?? ""}
                          onChange={(e) =>
                            updateSeq(i, { latencyMs: e.target.value ? Number(e.target.value) : undefined })
                          }
                        />
                        <span className="text-2xs text-[var(--text-3)]">ms</span>
                      </div>
                    </div>
                  </div>
                  <textarea
                    className="input text-xs py-1.5 font-mono resize-none"
                    rows={3}
                    placeholder='{"message": "ok"}'
                    value={seq.body}
                    onChange={(e) => updateSeq(i, { body: e.target.value })}
                  />
                </div>
              ))}
              <button
                onClick={addSeq}
                className="flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] self-start"
              >
                <Plus size={12} /> Add response
              </button>
            </>
          )}

          {tab === "headers" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-2)]">Response headers</label>
              <div className="border border-[var(--border)] rounded overflow-hidden">
                <KeyValueEditor
                  rows={draft.headers}
                  onChange={(rows) => set("headers", rows)}
                  keyPlaceholder="Content-Type"
                  valuePlaceholder="application/json"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-2)] shrink-0">
          <button onClick={onClose} className="btn text-xs">Cancel</button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="btn btn-primary text-xs"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

interface WebhookEndpoint {
  id: string;
  label: string;
}

function WebhookSection() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [logs, setLogs] = useState<Record<string, WebhookEntry[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { addToast } = useStore();

  const serverBase = `${window.location.protocol}//${window.location.hostname}:4000`;

  const addEndpoint = () => {
    const ep: WebhookEndpoint = { id: crypto.randomUUID(), label: `Webhook ${endpoints.length + 1}` };
    setEndpoints((prev) => [...prev, ep]);
  };

  const removeEndpoint = (id: string) => {
    setEndpoints((prev) => prev.filter((e) => e.id !== id));
    setLogs((prev) => { const next = { ...prev }; delete next[id]; return next; });
    if (expandedId === id) setExpandedId(null);
  };

  const refresh = useCallback(async (id: string) => {
    try {
      const entries = await loadWebhookLogs(id);
      setLogs((prev) => ({ ...prev, [id]: entries }));
    } catch (e) {
      addToast("error", String(e));
    }
  }, [addToast]);

  const clear = async (id: string) => {
    try {
      await clearWebhookLogs(id);
      setLogs((prev) => ({ ...prev, [id]: [] }));
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const copyUrl = (id: string) => {
    navigator.clipboard.writeText(`${serverBase}/webhook/${id}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  useEffect(() => {
    if (!expandedId) return;
    refresh(expandedId);
    const timer = setInterval(() => refresh(expandedId), 3000);
    return () => clearInterval(timer);
  }, [expandedId, refresh]);

  const fmt = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="border-b border-[var(--border)] shrink-0">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Webhooks {endpoints.length > 0 && `· ${endpoints.length}`}
        </span>
        <button
          onClick={addEndpoint}
          className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
          title="New webhook endpoint"
        >
          <Plus size={13} />
        </button>
      </div>

      {endpoints.length === 0 && (
        <p className="px-3 pb-3 text-xs text-[var(--text-3)]">No endpoints yet</p>
      )}

      {endpoints.map((ep) => {
        const epLogs = logs[ep.id] ?? [];
        const isExpanded = expandedId === ep.id;
        return (
          <div key={ep.id} className="border-t border-[var(--border)]">
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)]">
              <button
                onClick={() => setExpandedId(isExpanded ? null : ep.id)}
                className="text-[var(--text-3)]"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate">
                /webhook/{ep.id.slice(0, 8)}…
              </span>
              <button
                onClick={() => copyUrl(ep.id)}
                title="Copy URL"
                className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
              >
                {copied === ep.id ? (
                  <span className="text-2xs text-emerald-600">Copied</span>
                ) : (
                  <Copy size={11} />
                )}
              </button>
              <button
                onClick={() => removeEndpoint(ep.id)}
                className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
              >
                <Trash2 size={11} />
              </button>
            </div>
            {isExpanded && (
              <div className="border-t border-[var(--border)] bg-[var(--surface-2)]">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-2xs text-[var(--text-3)]">
                    {epLogs.length} {epLogs.length === 1 ? "request" : "requests"} · auto-refresh 3s
                  </span>
                  {epLogs.length > 0 && (
                    <button
                      onClick={() => clear(ep.id)}
                      className="text-2xs text-[var(--text-3)] hover:text-[var(--danger)]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-40 overflow-y-auto font-mono text-2xs">
                  {epLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-2 px-3 py-1 border-t border-[var(--border)]">
                      <span className="text-[var(--text-3)] shrink-0">{fmt(log.createdAt)}</span>
                      <MethodBadge method={log.method} />
                      <span className="flex-1 text-[var(--text-2)] truncate">
                        {log.body ? log.body.slice(0, 60) : "(empty)"}
                      </span>
                    </div>
                  ))}
                  {epLogs.length === 0 && (
                    <p className="px-3 py-2 text-[var(--text-3)]">Waiting for requests…</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MockPanel() {
  const { mockRoutes, mockLogs, mockStatus, set, addToast } = useStore();
  const [editingRoute, setEditingRoute] = useState<MockRoute | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const data = await loadMockRoutes();
      set({ mockRoutes: data.routes, mockLogs: data.logs });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const sync = async () => {
    const validation = validateMockRoutes(mockRoutes);
    if (!validation.valid) {
      const [firstError] = validation.errors;
      const remaining = validation.errors.length - 1;
      addToast(
        "error",
        `${firstError.message}${remaining > 0 ? ` (+${remaining} more)` : ""}`,
      );
      return;
    }
    if (validation.warnings.length > 0) {
      const [firstWarning] = validation.warnings;
      const remaining = validation.warnings.length - 1;
      addToast(
        "warn",
        `${firstWarning.message}${remaining > 0 ? ` (+${remaining} more)` : ""}`,
      );
    }
    try {
      set({ mockStatus: "Syncing…" });
      await syncMockRoutes(mockRoutes);
      set({ mockStatus: "Active" });
      addToast("success", "Routes synced");
    } catch (e) {
      set({ mockStatus: "Error" });
      addToast("error", String(e));
    }
  };

  const stop = async () => {
    try {
      set({ mockStatus: "Stopping…" });
      await syncMockRoutes([]);
      set({ mockStatus: "Inactive" });
      addToast("success", "Mock server stopped");
    } catch (e) {
      set({ mockStatus: "Error" });
      addToast("error", String(e));
    }
  };

  const clearLogs = async () => {
    try {
      await clearMockLogs();
      set({ mockLogs: [] });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const saveRoute = (route: MockRoute) => {
    const exists = mockRoutes.some((r) => r.id === route.id);
    set({
      mockRoutes: exists
        ? mockRoutes.map((r) => (r.id === route.id ? route : r))
        : [...mockRoutes, route],
    });
  };

  const deleteRoute = (id: string) =>
    set({ mockRoutes: mockRoutes.filter((r) => r.id !== id) });

  const toggleEnabled = (id: string) =>
    set({
      mockRoutes: mockRoutes.map((r) =>
        r.id === id ? { ...r, enabled: !(r.enabled !== false) } : r,
      ),
    });

  const fmt = (ts: number) =>
    new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
            Mock Server
          </span>
          {mockStatus && (
            <span
              className={`text-2xs px-1.5 py-0.5 rounded font-medium ${mockStatus === "Active" ? "bg-emerald-50 text-emerald-700" : mockStatus === "Error" ? "bg-red-50 text-red-600" : "bg-[var(--surface-2)] text-[var(--text-3)]"}`}
            >
              {mockStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
            title="Refresh"
            aria-label="Refresh"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Routes */}
      <div className="border-b border-[var(--border)] shrink-0">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
            Routes {mockRoutes.length > 0 && `· ${mockRoutes.length}`}
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={sync} className="btn text-2xs py-0.5 px-2">
              Sync
            </button>
            {mockStatus === "Active" && (
              <button
                onClick={stop}
                className="btn btn-danger text-2xs py-0.5 px-2"
              >
                Stop
              </button>
            )}
            <button
              onClick={() => setEditingRoute(makeRoute())}
              className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        <div className="max-h-52 overflow-y-auto">
          {mockRoutes.map((route) => (
            <div
              key={route.id}
              className="group flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)] border-t border-[var(--border)] cursor-pointer"
              onClick={() => setEditingRoute(route)}
            >
              <input
                type="checkbox"
                checked={route.enabled !== false}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleEnabled(route.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="accent-[var(--accent)] shrink-0"
              />
              <MethodBadge method={route.method} />
              <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate">
                {route.pathPattern}
              </span>
              {route.sequences && route.sequences.length > 0 ? (
                <span className="text-2xs shrink-0 bg-[var(--accent-subtle)] text-[var(--accent)] rounded px-1">
                  seq·{route.sequences.length}
                </span>
              ) : (
                <span
                  className={`text-2xs shrink-0 ${route.status >= 400 ? "text-red-500" : "text-[var(--text-3)]"}`}
                >
                  {route.status}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteId(route.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          {!mockRoutes.length && (
            <p className="p-4 text-xs text-[var(--text-3)] text-center">
              No routes yet
            </p>
          )}
        </div>
      </div>

      {/* Webhook Receiver */}
      <WebhookSection />

      {/* Request Log */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Request Log {mockLogs.length > 0 && `· ${mockLogs.length}`}
        </span>
        {mockLogs.length > 0 && (
          <button
            onClick={clearLogs}
            className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto font-mono text-2xs">
        {mockLogs.map((log) => (
          <div
            key={log.id}
            className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
          >
            <span className="text-[var(--text-3)] shrink-0">
              {fmt(log.createdAt)}
            </span>
            <MethodBadge method={log.method} />
            <span className="flex-1 text-[var(--text-1)] truncate">
              {log.path}
            </span>
            <span
              className={`shrink-0 font-semibold ${log.status >= 400 ? "text-red-500" : "text-emerald-600"}`}
            >
              {log.status}
            </span>
            {!log.matched && (
              <span className="text-2xs text-amber-500 shrink-0">
                unmatched
              </span>
            )}
          </div>
        ))}
        {!mockLogs.length && (
          <p className="p-4 text-xs text-[var(--text-3)] text-center">
            No requests yet
          </p>
        )}
      </div>

      {editingRoute && (
        <RouteModal
          route={editingRoute}
          onSave={saveRoute}
          onClose={() => setEditingRoute(null)}
        />
      )}

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Delete Route"
        message="Delete this route?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDeleteId) deleteRoute(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
