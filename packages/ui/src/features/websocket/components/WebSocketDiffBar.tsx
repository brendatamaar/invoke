import { ArrowLeftRight, X } from "lucide-react";

export function WebSocketDiffBar({
  selectedCount,
  onOpen,
  onClear,
}: {
  selectedCount: number;
  onOpen: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="border-t border-[var(--border)] px-3 py-1.5 flex items-center gap-2 shrink-0 bg-[var(--surface-2)]">
      <ArrowLeftRight size={11} className="text-[var(--accent)] shrink-0" />
      <span className="text-2xs text-[var(--text-2)] flex-1">
        {selectedCount === 1 ? "Select one more log to diff" : "2 logs selected"}
      </span>
      {selectedCount === 2 && (
        <button type="button" onClick={onOpen} className="btn btn-primary text-2xs px-2">
          Open diff
        </button>
      )}
      <button type="button" onClick={onClear} className="p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)]" aria-label="Clear diff selection">
        <X size={11} />
      </button>
    </div>
  );
}
