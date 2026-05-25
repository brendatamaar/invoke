import type { ReactNode } from "react";

export function FieldRow({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-3">
      <label className="text-xs text-[var(--text-2)]">{label}</label>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">{children}</div>
        {hint && <p className="mt-1 text-2xs text-[var(--text-3)]">{hint}</p>}
      </div>
    </div>
  );
}
