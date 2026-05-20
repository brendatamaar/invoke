import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { validateMockRoutes, type MockRoute } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { ConfirmModal } from "../../../components/shared/ConfirmModal";
import { clearMockLogs, loadMockRoutes, syncMockRoutes } from "../api";
import { MockRequestLog } from "./MockRequestLog";
import { MockRoutesSection } from "./MockRoutesSection";
import { ProxyRecordingSection } from "./ProxyRecordingSection";
import { RouteModal } from "./RouteModal";
import { WebhookSection } from "./WebhookSection";

export function MockPanel() {
  const { mockRoutes, mockLogs, mockTotalLogs, mockStatus, set, addToast } = useStore();
  const [editingRoute, setEditingRoute] = useState<MockRoute | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    try {
      const data = await loadMockRoutes();
      set({ mockRoutes: data.routes, mockLogs: data.logs, mockTotalLogs: data.totalLogs });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await coreStore.getMeta<MockRoute[]>("mockRoutes");
        if (saved?.length) {
          set({ mockRoutes: saved });
          await syncMockRoutes(saved);
          set({ mockStatus: "Active" });
        }
        const data = await loadMockRoutes();
        set({ mockLogs: data.logs, mockTotalLogs: data.totalLogs });
        if (!saved?.length) set({ mockRoutes: data.routes });
      } catch {
        loadMockRoutes()
          .then((data) =>
            set({ mockRoutes: data.routes, mockLogs: data.logs, mockTotalLogs: data.totalLogs }),
          )
          .catch(() => {});
      }
    };
    restore();

    pollingRef.current = setInterval(() => {
      loadMockRoutes()
        .then((data) => set({ mockLogs: data.logs, mockTotalLogs: data.totalLogs }))
        .catch(() => {});
    }, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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
      await coreStore.setMeta("mockRoutes", mockRoutes);
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
      await coreStore.setMeta("mockRoutes", []);
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
      set({ mockLogs: [], mockTotalLogs: 0 });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const persistRoutes = (routes: MockRoute[]) => {
    set({ mockRoutes: routes });
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
          onImport={importRoutes}
          onError={(msg) => addToast("error", `Import failed: ${msg}`)}
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
    </div>
  );
}
