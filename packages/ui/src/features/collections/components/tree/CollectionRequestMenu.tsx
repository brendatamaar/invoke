import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { CollectionMenuItem } from "../CollectionMenuItem";

export function CollectionRequestMenu({
  open,
  onToggle,
  onDuplicate,
  onDelete,
  menuRef,
}: {
  open: boolean;
  onToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={menuRef}
      className="opacity-0 group-hover:opacity-100 relative"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        onClick={onToggle}
        className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
      >
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-1 min-w-[140px]"
          onClick={(event) => event.stopPropagation()}
        >
          <CollectionMenuItem icon={<Copy size={12} />} label="Duplicate" onClick={onDuplicate} />
          <CollectionMenuItem
            icon={<Trash2 size={12} />}
            label="Delete"
            onClick={onDelete}
            danger
          />
        </div>
      )}
    </div>
  );
}
