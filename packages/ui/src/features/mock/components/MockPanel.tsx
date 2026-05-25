import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { validateMockRoutes, type MockRoute } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { useMockRoutes } from "../../../hooks/useDb";
import { ConfirmModal } from "../../../components/shared/ConfirmModal";
import { syncMockRoutes } from "../api";
import { useClearMockLogs, useMockData, useSyncMockRoutes } from "../useMockData";
import { MockRequestLog } from "./MockRequestLog";
import { MockRoutesSection } from "./MockRoutesSection";
import { ProxyRecordingSection } from "./ProxyRecordingSection";
import { RouteModal } from "./RouteModal";
import { WebhookSection } from "./WebhookSection";

export function MockPanel() {
  const { addToast } = useStore();
  const mockRoutes = useMockRoutes();
  const [editingRoute, setEditingRoute] = useState<MockRoute | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [mockStatus, setMockStatus] = useState("");

  const { data: mockData, refetch } = useMockData();
  const syncMutation = useSyncMockRoutes();
  const clearLogsMutation = useClearMockLogs();

  const mockLogs = mockData?.logs ?? [];
  const mockTotalLogs = mockData?.totalLogs ?? 0;

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
    setMockStatus("Syncing...");
    syncMutation.mutate(mockRoutes, {
      onSuccess: async () => {
        await coreStore.setMeta("mockRoutes", mockRoutes);
        setMockStatus("Active");
        addToast("success", "Routes synced");
      },
      onError: (e) => {
        setMockStatus("Error");
        addToast("error", String(e));
      },
    });
  };

  const stop = async () => {
    setMockStatus("Stopping...");
    try {
      await syncMockRoutes([]);
      await coreStore.setMeta("mockRoutes", []);
      setMockStatus("Inactive");
      addToast("success", "Mock server stopped");
    } catch (e) {
      setMockStatus("Error");
      addToast("error", String(e));
    }
  };

  const clearLogs = () => {
    clearLogsMutation.mutate(undefined, {
      onError: (e) => addToast("error", String(e)),
    });
  };

  const persistRoutes = (routes: MockRoute[]) => {
    coreStore.setMeta("mockRoutes", routes).catch(() => {});
  };

  const saveRoute = (route: MockRoute) => {
    const exists = mockRoutes.some((r) => r.id === route.id);
    persistRoutes(
      exists
        ? mockRoutes.map((r) => (r.id === route.id ? route : r))
        : [...mockRoutes, route],
    );
  };

  const deleteRoute = (id: string) =>
    persistRoutes(mockRoutes.filter((r) => r.id !== id));

  const importRoutes = (imported: MockRoute[]) => {
    const merged = [
      ...mockRoutes.filter((r) => !imported.some((ir) => ir.id === r.id)),
      ...imported,
    ];
    persistRoutes(merged);
    addToast("success", `Imported ${imported.length} route(s) — click Sync to apply`);
  };

  const toggleEnabled = (id: string) =>
    persistRoutes(
      mockRoutes.map((r) =>
        r.id === id ? { ...r, enabled: !(r.enabled !== false) } : r,
      ),
    );

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
            onClick={() => refetch()}
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
          onImport={importRoutes}
          onError={(msg) => addToast("error", `Import failed: ${msg}`)}
          onDeleteAll={() => setConfirmDeleteAll(true)}
        />
        <WebhookSection />
        <ProxyRecordingSection />
        <MockRequestLog logs={mockLogs} totalLogs={mockTotalLogs} onClear={clearLogs} />
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
      <ConfirmModal
        open={confirmDeleteAll}
        title="Delete All Routes"
        message="Delete all routes? This cannot be undone."
        confirmLabel="Delete All"
        danger
        onConfirm={() => {
          persistRoutes([]);
          setConfirmDeleteAll(false);
        }}
        onClose={() => setConfirmDeleteAll(false)}
      />
    </div>
  );
}
