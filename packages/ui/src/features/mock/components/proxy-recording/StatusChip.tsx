export function StatusChip({ status }: { status: number }) {
  const color =
    status >= 500
      ? "text-orange-600 bg-orange-50"
      : status >= 400
        ? "text-[var(--danger)] bg-[var(--danger-bg)]"
        : status >= 300
          ? "text-[var(--warn)] bg-[var(--warn-bg)]"
          : "text-[var(--ok)] bg-[var(--ok-bg)]";
  return (
    <span
      className={`inline-block rounded font-mono font-semibold text-2xs px-1.5 py-px leading-none ${color}`}
    >
      {status}
    </span>
  );
}
