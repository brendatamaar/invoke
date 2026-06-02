import { useRef, useState } from "react";
import { exportEnvText, parseEnvText, type Environment, type KeyValue } from "@invoke/core";
import { useStore } from "../../../store";
import { EnvironmentExportDialog } from "./environment-modal/EnvironmentExportDialog";
import { EnvironmentModalHeader } from "./environment-modal/EnvironmentModalHeader";
import { EnvironmentVariableTable } from "./environment-modal/EnvironmentVariableTable";
import { mergeVariables } from "../utils/merge";

export function EnvironmentModal({
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

  const setDraft = (patch: Partial<Environment>) => set({ envDraft: { ...draft, ...patch } });

  const setVar = (index: number, field: keyof KeyValue, value: string | boolean) =>
    setVariables(
      (draft.variables ?? []).map((variable, variableIndex) =>
        variableIndex === index ? { ...variable, [field]: value } : variable,
      ),
    );

  const setVariables = (variables: KeyValue[]) => setDraft({ variables });

  const importEnvFile = async (file?: File) => {
    if (!file) return;
    try {
      const imported = parseEnvText(await file.text());
      if (!imported.length) {
        addToast("warn", "No variables found in .env file");
        return;
      }
      setVariables(mergeVariables(draft.variables ?? [], imported));
      addToast("success", `Imported ${imported.length} variables`);
    } catch (error) {
      addToast("error", String(error));
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
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.name || "environment"}.env`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const requestExport = () => {
    if ((draft.variables ?? []).some((variable) => variable.sensitive)) {
      setExportChoiceOpen(true);
      return;
    }
    exportEnv(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 640, maxHeight: "80vh" }}
      >
        <EnvironmentModalHeader
          name={draft.name}
          fileInputRef={fileInputRef}
          onNameChange={(name) => setDraft({ name })}
          onImportFile={importEnvFile}
          onRequestExport={requestExport}
          onClose={onClose}
        />

        <EnvironmentVariableTable
          variables={draft.variables ?? []}
          revealed={revealed}
          onSetVar={setVar}
          onSetVariables={setVariables}
          onToggleReveal={(index) =>
            setRevealed((current) => {
              const next = new Set(current);
              if (next.has(index)) { next.delete(index); } else { next.add(index); }
              return next;
            })
          }
        />

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)] shrink-0">
          <button type="button" onClick={onClose} className="btn text-xs">
            Cancel
          </button>
          <button type="button" onClick={onSave} className="btn btn-primary text-xs">
            Save
          </button>
        </div>

        <EnvironmentExportDialog
          open={exportChoiceOpen}
          onClose={() => setExportChoiceOpen(false)}
          onExportNonSensitive={() => {
            setExportChoiceOpen(false);
            exportEnv(false);
          }}
          onExportAll={() => {
            setExportChoiceOpen(false);
            exportEnv(true);
          }}
        />
      </div>
    </div>
  );
}
