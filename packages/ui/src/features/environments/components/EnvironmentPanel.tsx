import { Plus } from "lucide-react";
import { useState } from "react";
import type { Environment } from "@invoke/core";
import { ConfirmModal } from "../../../components/shared/ConfirmModal";
import { useStore, coreStore } from "../../../store";
import { EnvironmentList } from "./EnvironmentList";
import { EnvironmentModal } from "./EnvironmentModal";

export function EnvironmentPanel() {
  const { environments, activeEnvironmentId, envDraft, set, addToast } = useStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openDraft = (env?: Environment) =>
    set({
      envDraft: env
        ? { ...env, variables: [...(env.variables ?? [])] }
        : {
            id: "",
            name: "New Environment",
            variables: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
    });

  const saveDraft = async () => {
    if (!envDraft) return;
    try {
      await coreStore.saveEnvironment({
        id: envDraft.id || undefined,
        name: envDraft.name,
        variables: envDraft.variables ?? [],
      });
      set({ envDraft: undefined });
      addToast("success", "Environment saved");
    } catch (error) {
      addToast("error", String(error));
    }
  };

  const deleteEnv = async (id: string) => {
    try {
      await coreStore.deleteEnvironment(id);
      if (activeEnvironmentId === id) set({ activeEnvironmentId: undefined });
    } catch (error) {
      addToast("error", String(error));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Environments
        </span>
        <button
          type="button"
          onClick={() => openDraft()}
          className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
          title="New environment"
        >
          <Plus size={13} />
        </button>
      </div>

      <EnvironmentList
        environments={environments}
        activeEnvironmentId={activeEnvironmentId}
        onActivate={(id) => set({ activeEnvironmentId: id })}
        onEdit={openDraft}
        onDelete={setConfirmDeleteId}
      />

      {envDraft && (
        <EnvironmentModal
          draft={envDraft}
          onSave={saveDraft}
          onClose={() => set({ envDraft: undefined })}
        />
      )}

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Delete Environment"
        message="Delete this environment?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDeleteId) deleteEnv(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
