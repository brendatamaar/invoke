import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { KeyValue } from "@invoke/core";
import { VariableAutocompleteInput } from "./VariableAutocompleteInput";
import type { KeyValueEditorProps } from "../../types";

const COL_TEMPLATE = "grid-cols-[8px_14px_8px_1fr_1px_1fr_28px]";

export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  disabled,
  variableAutocomplete = true,
  keyDatalist,
}: KeyValueEditorProps) {
  const uid = useId();
  const datalistId = keyDatalist ? `kve-key-${uid}` : undefined;
  const update = (i: number, field: keyof KeyValue, value: string | boolean) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r));
    onChange(next);
  };

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const add = () => onChange([...rows, { key: "", value: "", enabled: true }]);

  return (
    <div className="flex flex-col">
      {keyDatalist && (
        <datalist id={datalistId}>
          {keyDatalist.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </datalist>
      )}
      {rows.length > 0 && (
        <div
          className={`grid ${COL_TEMPLATE} items-center text-2xs text-[var(--text-3)] py-1 border-b border-[var(--border)]`}
        >
          <span />
          <span />
          <span />
          <span>Key</span>
          <span />
          <span className="pl-2">Value</span>
          <span />
        </div>
      )}
      {rows.map((row, i) => (
        <div
          key={row.key ? `row-${row.key}-${i}` : `row-${i}`}
          className={`group grid ${COL_TEMPLATE} items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]`}
        >
          <span />
          <input
            type="checkbox"
            checked={row.enabled !== false}
            onChange={(e) => update(i, "enabled", e.target.checked)}
            className="size-3.5"
            disabled={disabled}
            aria-label="Enable row"
          />
          <span />
          <input
            type="text"
            value={row.key}
            onChange={(e) => update(i, "key", e.target.value)}
            placeholder={keyPlaceholder}
            disabled={disabled}
            list={datalistId}
            aria-label={keyPlaceholder}
            className="w-full bg-transparent border-0 outline-none py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
          />
          <span className="h-4 bg-[var(--border)]" />
          {variableAutocomplete ? (
            <VariableAutocompleteInput
              value={row.value}
              onChange={(value) => update(i, "value", value)}
              placeholder={valuePlaceholder}
              disabled={disabled}
              className="w-full bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
            />
          ) : (
            <input
              type="text"
              value={row.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder={valuePlaceholder}
              disabled={disabled}
              aria-label={valuePlaceholder}
              className="w-full bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
            />
          )}
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={disabled}
            aria-label="Remove row"
            className="flex items-center justify-center text-[var(--text-3)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] w-full text-left"
      >
        <Plus size={12} /> Add row
      </button>
    </div>
  );
}
