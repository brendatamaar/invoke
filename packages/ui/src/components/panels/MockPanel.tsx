import { useState } from "react";
import { RefreshCw, Plus, Trash2, X } from "lucide-react";
import { useStore } from "../../store";
import { loadMockRoutes, syncMockRoutes, clearMockLogs } from "../../lib/api";
import { MethodBadge } from "../shared/MethodBadge";
import { KeyValueEditor } from "../shared/KeyValueEditor";
import { Select } from "../shared/Select";
import { ConfirmModal } from "../shared/ConfirmModal";
import { validateMockRoutes, type MockRoute } from "@invoke/core";

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

  const set = <K extends keyof MockRoute>(key: K, value: MockRoute[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 600, maxHeight: "82vh" }}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Method + Path */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-2)]">
              Endpoint
            </label>
            <div className="flex gap-2">
              <Select
                value={draft.method}
                onChange={(v) =>
                  set("method", v as unknown as MockRoute["method"])
                }
                size="sm"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
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

          {/* Status + Latency */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-2)]">
                Status code
              </label>
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
              <label className="text-xs font-medium text-[var(--text-2)]">
                Latency
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input text-sm py-1.5 w-28"
                  min={0}
                  placeholder="0"
                  value={draft.latencyMs ?? ""}
                  onChange={(e) =>
                    set(
                      "latencyMs",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                />
                <span className="text-sm text-[var(--text-3)]">ms</span>
              </div>
            </div>
          </div>

          {/* Response body */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-2)]">
              Response body
            </label>
            <textarea
              className="input text-sm py-2 font-mono resize-none"
              rows={6}
              placeholder='{"message": "ok"}'
              value={draft.body}
              onChange={(e) => set("body", e.target.value)}
            />
          </div>

          {/* Headers */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-2)]">
              Response headers
            </label>
            <div className="border border-[var(--border)] rounded overflow-hidden">
              <KeyValueEditor
                rows={draft.headers}
                onChange={(rows) => set("headers", rows)}
                keyPlaceholder="Content-Type"
                valuePlaceholder="application/json"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-2)] shrink-0">
          <button onClick={onClose} className="btn text-xs">
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="btn btn-primary text-xs"
          >
            Save
          </button>
        </div>
      </div>
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
              <span
                className={`text-2xs shrink-0 ${route.status >= 400 ? "text-red-500" : "text-[var(--text-3)]"}`}
              >
                {route.status}
              </span>
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
