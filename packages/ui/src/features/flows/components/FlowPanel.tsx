import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Flow } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { useFlows } from "../../../hooks/useDb";
import { ConfirmModal } from "../../../components/shared/ConfirmModal";
import { FlowModal } from "./FlowModal";

export function FlowPanel() {
  const { addToast } = useStore();
  const flows = useFlows();
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNew = () =>
    setEditingFlow({
      id: "",
      name: "New Flow",
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

  const deleteFlow = async (id: string) => {
    try {
      await coreStore.deleteFlow(id);
    } catch (e) {
      addToast("error", String(e));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Flows
        </span>
        <button
          onClick={openNew}
          className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className="group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--surface-2)]"
            onClick={() => setEditingFlow(flow)}
          >
            <span className="flex-1 text-xs text-[var(--text-1)] truncate">
              {flow.name}
            </span>
            <span className="text-2xs text-[var(--text-3)]">
              {flow.steps?.length ?? 0} steps
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteId(flow.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)]"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        {!flows.length && (
          <p className="p-4 text-xs text-[var(--text-3)] text-center">
            No flows yet
          </p>
        )}
      </div>

      {editingFlow && (
        <FlowModal flow={editingFlow} onClose={() => setEditingFlow(null)} />
      )}

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Delete Flow"
        message="Delete this flow?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDeleteId !== null) deleteFlow(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
