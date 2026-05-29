import { Play, X } from "lucide-react";

export function RunnerHeader({
  name,
  count,
  running,
  onClose,
}: {
  name: string;
  count: number;
  running: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
      <Play size={14} className="text-[var(--accent)]" />
      <span className="text-sm font-semibold">Run - {name}</span>
      <span className="ml-1 text-xs text-[var(--text-3)]">
        {count} request{count !== 1 ? "s" : ""}
      </span>
      {!running && (
        <button
          type="button"
          onClick={onClose}
          className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
