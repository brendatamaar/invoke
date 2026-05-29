import { Trash2, X } from "lucide-react";
import { useStore, coreStore } from "../../../store";

export function ClearHistoryModal() {
  const { showClearHistoryModal, set, addToast } = useStore();
  if (!showClearHistoryModal) return null;

  const close = () => set({ showClearHistoryModal: false });

  const confirm = async () => {
    await coreStore.clearHistory();
    set({ showClearHistoryModal: false });
    addToast("info", "History cleared");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={close} aria-label="Close" />
      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 360 }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Trash2 size={15} className="text-[var(--danger)]" />
          <span className="text-sm font-semibold">Clear History</span>
          <button
            type="button"
            onClick={close}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-[var(--text-2)]">
            This will permanently delete all request history. This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button type="button" onClick={close} className="btn btn-ghost text-xs px-3 py-1.5">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            className="btn text-xs px-3 py-1.5 bg-[var(--danger)] text-white hover:opacity-90"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
