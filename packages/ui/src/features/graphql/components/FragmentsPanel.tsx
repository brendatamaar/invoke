import { BookmarkPlus, Copy, Trash2 } from "lucide-react";
import type { SavedFragment } from "../types";

export function FragmentsPanel({
  fragments,
  onInsert,
  onDelete,
  onSaveFromQuery,
}: {
  fragments: SavedFragment[];
  onInsert: (frag: SavedFragment) => void;
  onDelete: (id: string) => void;
  onSaveFromQuery: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-2 py-1 border-b border-[var(--border)] shrink-0 flex items-center gap-1">
        <button
          type="button"
          onClick={onSaveFromQuery}
          className="flex items-center gap-1 text-2xs text-[var(--accent)] hover:underline"
          title="Save fragment definitions from current query"
        >
          <BookmarkPlus size={11} />
          Save from query
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {fragments.length === 0 ? (
          <p className="text-2xs text-[var(--text-3)] px-3 py-4 text-center">
            No saved fragments. Write a fragment definition in the query and click "Save from
            query".
          </p>
        ) : (
          fragments.map((frag) => (
            <div key={frag.id} className="border-b border-[var(--border)] px-2 py-1.5">
              <div className="flex items-start gap-1">
                <div className="flex-1 min-w-0">
                  <p className="text-2xs font-mono text-[var(--accent)] truncate">{frag.name}</p>
                  <p className="text-2xs text-[var(--text-3)] truncate">on {frag.onType}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onInsert(frag)}
                  className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--accent)] shrink-0"
                  title="Insert into query"
                >
                  <Copy size={10} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(frag.id)}
                  className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
                  title="Delete fragment"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
