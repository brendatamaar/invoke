import { useRef } from "react";
import { Plus, Trash2, GripVertical, Upload, X } from "lucide-react";
import type { KeyValue } from "@invoke/core";
import { VariableAutocompleteInput } from "../../../components/shared/VariableAutocompleteInput";
import { Select } from "../../../components/shared/Select";

const COL_TEMPLATE = "grid-cols-[16px_14px_8px_1fr_1px_80px_1px_1fr_28px]";

interface FormDataEditorProps {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
}

export function FormDataEditor({ rows, onChange }: FormDataEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingIndexRef = useRef<number>(-1);

  const update = (i: number, patch: Partial<KeyValue>) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const add = () => onChange([...rows, { key: "", value: "", enabled: true, type: "text" }]);

  const openFilePicker = (i: number) => {
    pendingIndexRef.current = i;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const i = pendingIndexRef.current;
    if (!file || i < 0) return;
    const reader = new FileReader();
    reader.onload = () => {
      update(i, { value: reader.result as string, fileName: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    pendingIndexRef.current = -1;
  };

  return (
    <div className="flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload file"
      />
      {rows.length > 0 && (
        <div
          className={`grid ${COL_TEMPLATE} items-center text-2xs text-[var(--text-3)] py-1 border-b border-[var(--border)]`}
        >
          <span />
          <span />
          <span />
          <span>Key</span>
          <span />
          <span className="text-center">Type</span>
          <span />
          <span className="pl-2">Value</span>
          <span />
        </div>
      )}
      {rows.map((row, i) => {
        const isFile = row.type === "file";
        return (
          <div
            key={`row-${i}`}
            className={`group grid ${COL_TEMPLATE} items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]`}
          >
            <span className="flex items-center justify-center text-[var(--text-3)] opacity-0 group-hover:opacity-100 cursor-grab">
              <GripVertical size={12} />
            </span>
            <input
              type="checkbox"
              checked={row.enabled !== false}
              onChange={(e) => update(i, { enabled: e.target.checked })}
              className="size-3.5"
              aria-label="Enable row"
            />
            <span />
            <input
              type="text"
              value={row.key}
              onChange={(e) => update(i, { key: e.target.value })}
              placeholder="key"
              aria-label="Key"
              className="w-full bg-transparent border-0 outline-none py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
            />
            <span className="h-4 bg-[var(--border)]" />
            <Select
              value={row.type ?? "text"}
              onChange={(e) => {
                const t = e.target.value as "text" | "file";
                update(i, { type: t, value: "", fileName: undefined });
              }}
              size="2xs"
              wrapperClassName="w-full"
            >
              <option value="text">Text</option>
              <option value="file">File</option>
            </Select>
            <span className="h-4 bg-[var(--border)]" />
            {isFile ? (
              <div className="flex items-center gap-1 px-2 py-1 min-w-0">
                {row.value ? (
                  <>
                    <Upload size={10} className="shrink-0 text-[var(--accent)]" />
                    <span className="text-2xs font-mono text-[var(--text-1)] truncate flex-1">
                      {row.fileName ?? "file selected"}
                    </span>
                    <button
                      type="button"
                      onClick={() => update(i, { value: "", fileName: undefined })}
                      className="shrink-0 text-[var(--text-3)] hover:text-[var(--danger)]"
                    >
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openFilePicker(i)}
                    className="flex items-center gap-1 text-2xs text-[var(--text-3)] hover:text-[var(--text-1)]"
                  >
                    <Upload size={10} /> Choose file
                  </button>
                )}
              </div>
            ) : (
              <VariableAutocompleteInput
                value={row.value}
                onChange={(value) => update(i, { value })}
                placeholder="value"
                className="w-full bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
              />
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex items-center justify-center text-[var(--text-3)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] w-full text-left"
      >
        <Plus size={12} /> Add row
      </button>
    </div>
  );
}
