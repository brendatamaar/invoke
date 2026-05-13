import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { validateMockRoutes, type MockRoute } from "@invoke/core";
import { useStore } from "../../../store";
import { ConfirmModal } from "../../../components/shared/ConfirmModal";
import { clearMockLogs, loadMockRoutes, syncMockRoutes } from "../api";
import { MockRequestLog } from "./MockRequestLog";
import { MockRoutesSection } from "./MockRoutesSection";
import { ProxyRecordingSection } from "./ProxyRecordingSection";
import { RouteModal } from "./RouteModal";
import { WebhookSection } from "./WebhookSection";

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
      set({ mockStatus: "Syncing..." });
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
      set({ mockStatus: "Stopping..." });
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
            Mock Server
          </span>
          {mockStatus && (
            <span
              className={`text-2xs px-1.5 py-0.5 rounded font-medium ${mockStatus === "Active" ? "bg-[var(--ok-bg)] text-[var(--ok)]" : mockStatus === "Error" ? "bg-[var(--danger-bg)] text-[var(--danger)]" : "bg-[var(--surface-2)] text-[var(--text-3)]"}`}
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

      <div className="flex-1 overflow-y-auto min-h-0">
        <MockRoutesSection
          routes={mockRoutes}
          status={mockStatus}
          onAdd={setEditingRoute}
          onEdit={setEditingRoute}
          onSync={sync}
          onStop={stop}
          onToggleEnabled={toggleEnabled}
          onDelete={setConfirmDeleteId}
        />
        <WebhookSection />
        <ProxyRecordingSection />
        <MockRequestLog logs={mockLogs} onClear={clearLogs} />
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
