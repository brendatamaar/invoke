import { useState, useEffect } from "react";
import { X, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useStore, coreStore } from "../../../store";
import { useCollections, useFolders } from "../../../hooks/useDb";
import type { KeyValue } from "@invoke/core";

export function VariableEditorModal() {
  const { variableEditor, set, addToast } = useStore();
  const collections = useCollections();
  const folders = useFolders();
  const [rows, setRows] = useState<KeyValue[]>([]);

  useEffect(() => {
    setRows(variableEditor.variables.length ? variableEditor.variables : []);
  }, [variableEditor.open]);

  if (!variableEditor.open) return null;

  const close = () => set({ variableEditor: { ...variableEditor, open: false } });

  const save = async () => {
    try {
      if (variableEditor.kind === "collection" && variableEditor.id) {
        const col = collections.find((c) => c.id === variableEditor.id);
        if (col) {
          await coreStore.updateCollection({ ...col, variables: rows });
        }
      } else if (variableEditor.kind === "folder" && variableEditor.id) {
        const folder = folders.find((f) => f.id === variableEditor.id);
        if (folder) {
          await coreStore.updateFolder({ ...folder, variables: rows });
        }
      }
      addToast("success", "Variables saved");
      close();
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const addRow = () => setRows([...rows, { key: "", value: "", enabled: true, sensitive: false }]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<KeyValue>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 520, maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-semibold">Variables — {variableEditor.name}</span>
          <button
            onClick={close}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 min-h-0">
          {rows.length === 0 && (
            <p className="text-xs text-[var(--text-3)] text-center py-4">No variables yet</p>
          )}
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={row.key}
                onChange={(e) => updateRow(i, { key: e.target.value })}
                placeholder="variable"
                className="input text-xs py-1 flex-1 font-mono"
              />
              <input
                type={row.sensitive ? "password" : "text"}
                value={row.value}
                onChange={(e) => updateRow(i, { value: e.target.value })}
                placeholder="value"
                className="input text-xs py-1 flex-1 font-mono"
              />
              <button
                onClick={() => updateRow(i, { sensitive: !row.sensitive })}
                title={row.sensitive ? "Unmask value" : "Mask value"}
                className={`p-1 ${row.sensitive ? "text-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
              >
                {row.sensitive ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button
                onClick={() => removeRow(i)}
                className="text-[var(--text-3)] hover:text-[var(--danger)] p-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button onClick={addRow} className="btn text-xs self-start mt-1 flex items-center gap-1">
            <Plus size={12} /> Add variable
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button onClick={close} className="btn text-xs">
            Cancel
          </button>
          <button
            onClick={save}
            className="btn text-xs bg-[var(--accent)] text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
