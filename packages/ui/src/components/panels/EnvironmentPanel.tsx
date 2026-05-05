import { Plus, X, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useStore, coreStore } from "../../store";
import type { Environment, KeyValue } from "@invoke/core";
import { ConfirmModal } from "../shared/ConfirmModal";

export function EnvironmentPanel() {
  const { environments, activeEnvironmentId, envDraft, set, addToast } = useStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openDraft = (env?: Environment) =>
    set({ envDraft: env ? { ...env, variables: [...(env.variables ?? [])] } : { id: "", name: "New Environment", variables: [], createdAt: Date.now(), updatedAt: Date.now() } });

  const saveDraft = async () => {
    if (!envDraft) return;
    try {
      await coreStore.saveEnvironment({ id: envDraft.id || undefined, name: envDraft.name, variables: envDraft.variables ?? [] });
      const envs = await coreStore.listEnvironments();
      set({ environments: envs, envDraft: undefined });
      addToast("success", "Environment saved");
    } catch (e) { addToast("error", String(e)); }
  };

  const deleteEnv = async (id: string) => {
    try {
      await coreStore.deleteEnvironment(id);
      const envs = await coreStore.listEnvironments();
      set({ environments: envs, activeEnvironmentId: activeEnvironmentId === id ? undefined : activeEnvironmentId });
    } catch (e) { addToast("error", String(e)); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Environments</span>
        <button onClick={() => openDraft()} className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"><Plus size={13} /></button>
      </div>

      {!envDraft ? (
        <div className="flex-1 overflow-y-auto py-1">
          {environments.map((env) => (
            <div
              key={env.id}
              className={`group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--surface-2)] ${activeEnvironmentId === env.id ? "bg-[var(--accent-subtle)]" : ""}`}
              onClick={() => set({ activeEnvironmentId: env.id })}
            >
              <span className={`flex-1 text-xs truncate ${activeEnvironmentId === env.id ? "text-[var(--accent)] font-medium" : "text-[var(--text-1)]"}`}>{env.name}</span>
              <span className="text-2xs text-[var(--text-3)]">{env.variables?.length ?? 0} vars</span>
              <button onClick={(e) => { e.stopPropagation(); openDraft(env); }} className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--accent)] p-0.5">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(env.id); }} className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"><X size={12} /></button>
            </div>
          ))}
          {!environments.length && <p className="p-4 text-xs text-[var(--text-3)] text-center">No environments yet</p>}
        </div>
      ) : (
        <EnvEditor draft={envDraft} onSave={saveDraft} onCancel={() => set({ envDraft: undefined })} />
      )}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Delete Environment"
        message="Delete this environment?"
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (confirmDeleteId) deleteEnv(confirmDeleteId); setConfirmDeleteId(null); }}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

function EnvEditor({ draft, onSave, onCancel }: { draft: Environment; onSave: () => void; onCancel: () => void }) {
  const { set } = useStore();
  const [masked, setMasked] = useState<Set<number>>(new Set());

  const setDraft = (patch: Partial<Environment>) => set({ envDraft: { ...draft, ...patch } });
  const setVar = (i: number, field: keyof KeyValue, value: string | boolean) =>
    setDraft({ variables: (draft.variables ?? []).map((v, idx) => idx === i ? { ...v, [field]: value } : v) });
  const addVar = () => setDraft({ variables: [...(draft.variables ?? []), { key: "", value: "", enabled: true }] });
  const removeVar = (i: number) => setDraft({ variables: (draft.variables ?? []).filter((_, idx) => idx !== i) });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-[var(--border)]">
        <input value={draft.name} onChange={(e) => setDraft({ name: e.target.value })} className="input text-sm font-medium py-1" placeholder="Environment name" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-0 border-b border-[var(--border)] text-2xs text-[var(--text-3)]">
          <span className="w-3.5 h-3.5 mx-2 shrink-0" />
          <span className="flex-1 py-1.5">Key</span>
          <span className="w-px shrink-0" />
          <div className="flex-1 flex items-center min-w-0">
            <span className="flex-1 px-2 py-1.5">Value</span>
            <span className="px-1.5 shrink-0 invisible"><Eye size={11} /></span>
          </div>
          <span className="px-2 shrink-0 invisible">×</span>
        </div>
        {(draft.variables ?? []).map((v, i) => (
          <div key={i} className="flex items-center gap-0 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
            <input type="checkbox" checked={v.enabled !== false} onChange={(e) => setVar(i, "enabled", e.target.checked)} className="w-3.5 h-3.5 mx-2 accent-[var(--accent)] shrink-0" />
            <input value={v.key} onChange={(e) => setVar(i, "key", e.target.value)} placeholder="KEY" className="flex-1 bg-transparent border-0 outline-none py-1.5 text-xs font-mono min-w-0" />
            <span className="w-px h-4 bg-[var(--border)] shrink-0" />
            <div className="flex-1 flex items-center min-w-0">
              <input type={masked.has(i) ? "password" : "text"} value={v.value} onChange={(e) => setVar(i, "value", e.target.value)} placeholder="value" className="flex-1 bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono min-w-0" />
              <button onClick={() => setMasked((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })} className="px-1.5 text-[var(--text-3)] shrink-0">
                {masked.has(i) ? <EyeOff size={11} /> : <Eye size={11} />}
              </button>
            </div>
            <button onClick={() => removeVar(i)} className="px-2 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0">×</button>
          </div>
        ))}
        <button onClick={addVar} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] w-full">
          <Plus size={12} /> Add variable
        </button>
      </div>
      <div className="flex justify-end gap-2 p-3 border-t border-[var(--border)]">
        <button onClick={onCancel} className="btn text-xs">Cancel</button>
        <button onClick={onSave} className="btn btn-primary text-xs">Save</button>
      </div>
    </div>
  );
}
