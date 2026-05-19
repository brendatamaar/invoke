import { FilePen, FilePlus, X } from "lucide-react";
import { useStore, coreStore } from "../../../store";

export function SaveActionModal() {
  const { showSaveActionModal, set, request, requests, saveDialog, addToast } =
    useStore();

  if (!showSaveActionModal) return null;

  const savedEntry = requests.find((r) => r.id === request.id);

  const close = () => set({ showSaveActionModal: false });

  const updateExisting = async () => {
    if (!savedEntry) return;
    try {
      await coreStore.saveRequest(request, savedEntry.name, savedEntry.collectionId, {
        id: savedEntry.id,
        folderId: savedEntry.folderId,
      });
      const updated = await coreStore.listRequests();
      set({ requests: updated, showSaveActionModal: false });
      addToast("success", "Request updated");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const saveAsNew = () => {
    set({
      showSaveActionModal: false,
      saveDialog: {
        ...saveDialog,
        open: true,
        name: request.name || request.url || "",
        collectionId: savedEntry?.collectionId ?? "",
        folderId: savedEntry?.folderId ?? "",
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 480 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-semibold text-[var(--text-1)]">
            Save Request
          </span>
          <button
            onClick={close}
            className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-xs text-[var(--text-3)] mb-4">
            You have unsaved changes to{" "}
            <span className="text-[var(--text-1)] font-medium font-mono break-all">
              {savedEntry?.name || "this request"}
            </span>
            . What would you like to do?
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={updateExisting}
              className="flex items-center gap-3 px-3 py-2.5 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] text-left transition-colors group"
            >
              <FilePen size={15} className="text-[var(--accent)] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--text-1)] break-all">
                  Update "{savedEntry?.name || "existing"}"
                </p>
                <p className="text-2xs text-[var(--text-3)]">
                  Overwrite the saved request with your changes
                </p>
              </div>
            </button>

            <button
              onClick={saveAsNew}
              className="flex items-center gap-3 px-3 py-2.5 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] text-left transition-colors group"
            >
              <FilePlus size={15} className="text-[var(--accent)] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--text-1)]">
                  Save as new request
                </p>
                <p className="text-2xs text-[var(--text-3)]">
                  Keep the original and save a copy
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-3 border-t border-[var(--border)]">
          <button onClick={close} className="btn btn-ghost text-xs px-3 py-1.5">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
