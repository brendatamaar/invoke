import type { ReactNode } from "react";

export function GQLOptionField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-36 shrink-0 text-xs text-[var(--text-2)]">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function GQLSectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="pt-1 text-2xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
      {children}
    </p>
  );
}
