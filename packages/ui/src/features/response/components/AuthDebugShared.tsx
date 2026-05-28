import type { ReactNode } from "react";

export function Section({
  title,
  icon,
  meta,
  children,
}: {
  title: string;
  icon: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)]">
          {icon}
        </span>
        <span className="text-xs font-semibold text-[var(--text-1)]">{title}</span>
        {meta && <div className="ml-auto">{meta}</div>}
      </div>
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "accent";
}) {
  const tones = {
    neutral: "border-[var(--border)] bg-[var(--surface)] text-[var(--text-3)]",
    ok: "border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok)]",
    warn: "border-[var(--warn)] bg-[var(--warn-bg)] text-[var(--warn)]",
    danger: "border-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger)]",
    accent: "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-xs text-[var(--text-3)]">
      <span className="text-[var(--text-3)]">{icon}</span>
      {children}
    </div>
  );
}

export function Row({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(7rem,10rem)_minmax(0,1fr)] gap-3 border-b border-[var(--border)] px-3 py-2.5 last:border-0">
      <span className="text-2xs font-medium text-[var(--text-3)]">{label}</span>
      <span className={`min-w-0 break-all text-xs text-[var(--text-1)] ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
