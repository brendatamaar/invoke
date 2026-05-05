import { Plus, Trash2, GripVertical } from "lucide-react";
import type { KeyValue } from "@invoke/core";

interface Props {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
}

export function KeyValueEditor({ rows, onChange, keyPlaceholder = "Key", valuePlaceholder = "Value", disabled }: Props) {
  const update = (i: number, field: keyof KeyValue, value: string | boolean) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r);
    onChange(next);
  };

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const add = () => onChange([...rows, { key: "", value: "", enabled: true }]);

  return (
    <div className="flex flex-col">
      {rows.length > 0 && (
        <div className="flex items-center gap-0 text-2xs text-[var(--text-3)] px-2 py-1 border-b border-[var(--border)]">
          <span className="w-4 shrink-0" />
          <span className="w-4 shrink-0 mr-1" />
          <span className="flex-1">Key</span>
          <span className="flex-1">Value</span>
          <span className="w-7 shrink-0" />
        </div>
      )}
      {rows.map((row, i) => (
        <div key={i} className="group flex items-center gap-0 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
          <span className="w-4 shrink-0 flex items-center justify-center text-[var(--text-3)] opacity-0 group-hover:opacity-100 cursor-grab">
            <GripVertical size={12} />
          </span>
          <input
            type="checkbox"
            checked={row.enabled !== false}
            onChange={(e) => update(i, "enabled", e.target.checked)}
            className="w-3.5 h-3.5 mr-2 accent-[var(--accent)] shrink-0"
            disabled={disabled}
          />
          <input
            type="text"
            value={row.key}
            onChange={(e) => update(i, "key", e.target.value)}
            placeholder={keyPlaceholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-0 outline-none py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
          />
          <span className="w-px h-4 bg-[var(--border)] shrink-0" />
          <input
            type="text"
            value={row.value}
            onChange={(e) => update(i, "value", e.target.value)}
            placeholder={valuePlaceholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
          />
          <button
            onClick={() => remove(i)}
            disabled={disabled}
            className="w-7 shrink-0 flex items-center justify-center text-[var(--text-3)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] w-full text-left"
      >
        <Plus size={12} /> Add row
      </button>
    </div>
  );
}
