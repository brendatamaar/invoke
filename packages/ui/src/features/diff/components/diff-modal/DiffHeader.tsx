import { ArrowLeftRight, X } from "lucide-react";

export function DiffHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
      <ArrowLeftRight size={15} className="text-[var(--accent)]" />
      <span className="text-sm font-semibold">Compare Responses</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
      >
        <X size={15} />
      </button>
    </div>
  );
}
