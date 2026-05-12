import {
  Plus,
  X,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Upload,
  Download,
  Edit3,
} from "lucide-react";
import { useRef, useState } from "react";
import { useStore, coreStore } from "../../../store";
import {
  exportEnvText,
  isSensitiveVariableName,
  parseEnvText,
  type Environment,
  type KeyValue,
} from "@invoke/core";
import { ConfirmModal } from "../../../components/shared/ConfirmModal";
import { Dialog } from "../../../components/shared/Dialog";

export function EnvironmentPanel() {
  const { environments, activeEnvironmentId, envDraft, set, addToast } =
    useStore();
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
      const envs = await coreStore.listEnvironments();
      set({ environments: envs, envDraft: undefined });
      addToast("success", "Environment saved");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const deleteEnv = async (id: string) => {
    try {
      await coreStore.deleteEnvironment(id);
      const envs = await coreStore.listEnvironments();
      set({
        environments: envs,
        activeEnvironmentId:
          activeEnvironmentId === id ? undefined : activeEnvironmentId,
      });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] shrink-0">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Environments
        </span>
        <button
          onClick={() => openDraft()}
          className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
          title="New environment"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {environments.map((env) => (
          <div
            key={env.id}
            className={`group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--surface-2)] ${activeEnvironmentId === env.id ? "bg-[var(--accent-subtle)]" : ""}`}
            onClick={() => set({ activeEnvironmentId: env.id })}
          >
            <span
              className={`flex-1 text-xs truncate ${activeEnvironmentId === env.id ? "text-[var(--accent)] font-medium" : "text-[var(--text-1)]"}`}
            >
              {env.name}
            </span>
            <span className="text-2xs text-[var(--text-3)]">
              {env.variables?.length ?? 0} vars
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDraft(env);
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
              title="Edit"
            >
              <Edit3 size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteId(env.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
              title="Delete"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {!environments.length && (
          <p className="p-4 text-xs text-[var(--text-3)] text-center">
            No environments yet
          </p>
        )}
      </div>

      {/* Modal */}
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

function EnvironmentModal({
  draft,
  onSave,
  onClose,
}: {
  draft: Environment;
  onSave: () => void;
  onClose: () => void;
}) {
  const { set, addToast } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [exportChoiceOpen, setExportChoiceOpen] = useState(false);

  const setDraft = (patch: Partial<Environment>) =>
    set({ envDraft: { ...draft, ...patch } });

  const setVar = (i: number, field: keyof KeyValue, value: string | boolean) =>
    setDraft({
      variables: (draft.variables ?? []).map((v, idx) =>
        idx === i ? { ...v, [field]: value } : v,
      ),
    });

  const addVar = () =>
    setDraft({
      variables: [
        ...(draft.variables ?? []),
        { key: "", value: "", enabled: true },
      ],
    });

  const removeVar = (i: number) =>
    setDraft({
      variables: (draft.variables ?? []).filter((_, idx) => idx !== i),
    });

  const importEnvFile = async (file?: File) => {
    if (!file) return;
    try {
      const imported = parseEnvText(await file.text());
      if (!imported.length) {
        addToast("warn", "No variables found in .env file");
        return;
      }
      setDraft({ variables: mergeVariables(draft.variables ?? [], imported) });
      addToast("success", `Imported ${imported.length} variables`);
    } catch (e) {
      addToast("error", String(e));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const exportEnv = (includeSensitive: boolean) => {
    const text = exportEnvText(draft.variables ?? [], { includeSensitive });
    if (!text.trim()) {
      addToast("warn", "No variables to export");
      return;
    }
    const blob = new Blob([`${text}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.name || "environment"}.env`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasSensitive = (draft.variables ?? []).some((v) => v.sensitive);
  const requestExport = () => {
    if (hasSensitive) {
      setExportChoiceOpen(true);
      return;
    }
    exportEnv(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col"
        style={{ width: 640, maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ name: e.target.value })}
            className="flex-1 bg-transparent outline-none text-sm font-semibold text-[var(--text-1)] placeholder-[var(--text-3)]"
            placeholder="Environment name"
          />
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".env,text/plain"
              className="hidden"
              onChange={(e) => importEnvFile(e.target.files?.[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn text-2xs py-0.5 px-2 flex items-center gap-1"
              title="Import .env"
            >
              <Upload size={11} /> Import
            </button>
            <button
              onClick={requestExport}
              className="btn text-2xs py-0.5 px-2 flex items-center gap-1"
              title="Export .env"
            >
              <Download size={11} /> Export
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)] ml-1"
          >
            <X size={14} />
          </button>
        </div>

        {/* Variable table */}
        <div className="flex-1 overflow-y-auto">
          {/* Column headers */}
          <div className="flex items-center border-b border-[var(--border)] text-2xs text-[var(--text-3)] bg-[var(--surface-2)]">
            <span className="w-7 shrink-0" />
            <span className="flex-1 px-2 py-1.5">Key</span>
            <span className="w-px h-4 bg-[var(--border)] shrink-0" />
            <span className="flex-1 px-2 py-1.5">Value</span>
            <span className="w-16 shrink-0" />
          </div>

          {(draft.variables ?? []).map((v, i) => (
            <div
              key={i}
              className="flex items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
            >
              <input
                type="checkbox"
                checked={v.enabled !== false}
                onChange={(e) => setVar(i, "enabled", e.target.checked)}
                className="w-3.5 h-3.5 mx-2 accent-[var(--accent)] shrink-0"
              />
              <input
                value={v.key}
                onChange={(e) => {
                  const key = e.target.value;
                  setDraft({
                    variables: (draft.variables ?? []).map((item, idx) =>
                      idx === i
                        ? {
                            ...item,
                            key,
                            sensitive:
                              item.sensitive || isSensitiveVariableName(key),
                          }
                        : item,
                    ),
                  });
                }}
                placeholder="KEY"
                className="flex-1 bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono min-w-0"
              />
              <span className="w-px h-4 bg-[var(--border)] shrink-0" />
              <div className="flex-1 flex items-center min-w-0">
                <input
                  type={v.sensitive && !revealed.has(i) ? "password" : "text"}
                  value={v.value}
                  onChange={(e) => setVar(i, "value", e.target.value)}
                  placeholder="value"
                  className="flex-1 bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono min-w-0"
                />
                <button
                  onClick={() =>
                    setRevealed((s) => {
                      const n = new Set(s);
                      n.has(i) ? n.delete(i) : n.add(i);
                      return n;
                    })
                  }
                  disabled={!v.sensitive}
                  className="px-1.5 text-[var(--text-3)] disabled:opacity-25 shrink-0"
                  title={v.sensitive ? "Toggle reveal" : "Value is public"}
                >
                  {v.sensitive && !revealed.has(i) ? (
                    <EyeOff size={11} />
                  ) : (
                    <Eye size={11} />
                  )}
                </button>
                <button
                  onClick={() => setVar(i, "sensitive", !v.sensitive)}
                  className={`px-1.5 shrink-0 ${v.sensitive ? "text-[var(--warn)]" : "text-[var(--text-3)]"}`}
                  title={v.sensitive ? "Mark public" : "Mark sensitive"}
                >
                  {v.sensitive ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
              </div>
              <button
                onClick={() => removeVar(i)}
                className="px-2 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          <button
            onClick={addVar}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] w-full"
          >
            <Plus size={12} /> Add variable
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)] shrink-0">
          <button onClick={onClose} className="btn text-xs">
            Cancel
          </button>
          <button onClick={onSave} className="btn btn-primary text-xs">
            Save
          </button>
        </div>

        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Dialog
            open={exportChoiceOpen}
            onClose={() => setExportChoiceOpen(false)}
            title="Export Environment"
            width="420px"
            footer={
              <>
                <button
                  className="btn text-xs"
                  onClick={() => setExportChoiceOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary text-xs"
                  onClick={() => {
                    setExportChoiceOpen(false);
                    exportEnv(false);
                  }}
                >
                  Export non-sensitive
                </button>
                <button
                  className="btn btn-danger text-xs"
                  onClick={() => {
                    setExportChoiceOpen(false);
                    exportEnv(true);
                  }}
                >
                  Export all
                </button>
              </>
            }
          >
            <p className="text-sm text-[var(--text-2)]">
              This environment contains sensitive variables. Choose whether to
              exclude sensitive values or include every value in the exported
              .env file.
            </p>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

function mergeVariables(existing: KeyValue[], imported: KeyValue[]) {
  const byKey = new Map<string, KeyValue>();
  existing.forEach((v) => byKey.set(v.key, v));
  imported.forEach((v) => byKey.set(v.key, { ...byKey.get(v.key), ...v }));
  return [...byKey.values()];
}
