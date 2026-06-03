import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";

const SENSITIVE_KEYS = new Set(["authorization", "cookie", "set-cookie", "proxy-authorization"]);

export function SensitiveKeyValueEditor({
  rows,
  onChange,
}: {
  rows: { key: string; value: string; enabled?: boolean }[];
  onChange: (rows: { key: string; value: string; enabled?: boolean }[]) => void;
}) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const update = (i: number, field: string, value: string | boolean) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { key: "", value: "", enabled: true }]);
  const toggleReveal = (i: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });

  return (
    <div className="flex flex-col">
      {rows.length > 0 && (
        <div className="grid grid-cols-[4px_14px_8px_1fr_1px_1fr_24px_24px] items-center text-2xs text-[var(--text-3)] py-1 border-b border-[var(--border)]">
          <span />
          <span />
          <span />
          <span>Key</span>
          <span />
          <span className="pl-2">Value</span>
          <span />
          <span />
        </div>
      )}
      {rows.map((row, i) => {
        const isSensitive = SENSITIVE_KEYS.has(row.key.toLowerCase());
        const isRevealed = revealed.has(i);
        return (
          <div
            key={`${row.key}-${i}`}
            className="group grid grid-cols-[4px_14px_8px_1fr_1px_1fr_24px_24px] items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
          >
            <span />
            <input
              type="checkbox"
              checked={row.enabled !== false}
              onChange={(e) => update(i, "enabled", e.target.checked)}
              aria-label="Enable row"
              className="size-3.5"
            />
            <span />
            <input
              type="text"
              value={row.key}
              onChange={(e) => update(i, "key", e.target.value)}
              placeholder="Header"
              aria-label="Header key"
              className="w-full bg-transparent border-0 outline-none py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
            />
            <span className="h-4 bg-[var(--border)]" />
            <input
              type={isSensitive && !isRevealed ? "password" : "text"}
              value={row.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="Value"
              aria-label="Header value"
              className="w-full bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] min-w-0"
            />
            <button
              type="button"
              onClick={() => toggleReveal(i)}
              title={isRevealed ? "Hide value" : "Reveal value"}
              aria-label={isRevealed ? "Hide value" : "Reveal value"}
              className={`w-6 flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text-1)] ${!isSensitive ? "invisible" : ""}`}
            >
              {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove row"
              className="w-6 flex items-center justify-center text-[var(--text-3)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={11} />
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
