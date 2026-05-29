import { FileText, MoreHorizontal, Play, Trash2, Variable } from "lucide-react";
import { CollectionMenuItem } from "../CollectionMenuItem";

export function FolderActionsMenu({
  open,
  menuRef,
  onToggle,
  onRun,
  onVariables,
  onDescription,
  onDelete,
}: {
  open: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onRun: () => void;
  onVariables: () => void;
  onDescription: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      ref={menuRef}
      className="opacity-0 group-hover:opacity-100 relative"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onToggle}
        className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
      >
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-1 min-w-[140px]">
          <CollectionMenuItem icon={<Play size={12} />} label="Run" onClick={onRun} />
          <CollectionMenuItem
            icon={<Variable size={12} />}
            label="Variables"
            onClick={onVariables}
          />
          <CollectionMenuItem
            icon={<FileText size={12} />}
            label="Description"
            onClick={onDescription}
          />
          <CollectionMenuItem
            icon={<Trash2 size={12} />}
            label="Delete"
            danger
            onClick={onDelete}
          />
        </div>
      )}
    </div>
  );
}
