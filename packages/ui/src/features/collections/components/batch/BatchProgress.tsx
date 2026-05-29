export function BatchProgress({ progress }: { progress: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-2)]">Running…</span>
        <span className="text-xs text-[var(--text-3)]">{progress}%</span>
      </div>
      <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden border border-[var(--border)]">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-200 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
