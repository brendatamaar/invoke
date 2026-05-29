import type { FieldProps } from "../../../../../types";

export function Field({ label, children }: FieldProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--text-2)] w-24 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
