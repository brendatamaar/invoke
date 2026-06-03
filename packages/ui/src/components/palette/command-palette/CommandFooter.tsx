const HINTS = [
  ["↑↓", "Navigate"],
  ["↵", "Select"],
  ["esc", "Close"],
];

export function CommandFooter() {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-2)]">
      {HINTS.map(([key, label]) => (
        <span key={key} className="flex items-center gap-1.5 text-2xs text-[var(--text-3)]">
          <kbd className="px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono">
            {key}
          </kbd>{" "}
          {label}
        </span>
      ))}
    </div>
  );
}
