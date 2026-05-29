import type { ReactNode } from "react";

export function CollectionMenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--surface-2)] ${danger ? "text-[var(--danger)]" : "text-[var(--text-1)]"}`}
    >
      {icon} {label}
    </button>
  );
}
