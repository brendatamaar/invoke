import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import type { HistoryEntry } from "@invoke/core";
import { HistoryItem } from "./HistoryItem";

export function HistoryGroup({
  label,
  entries,
  restore,
  onDeleteGroup,
  onDeleteEntry,
  onPin,
  onLabel,
  onCreateMock,
}: {
  label: string;
  entries: HistoryEntry[];
  restore: (entry: HistoryEntry) => void;
  onDeleteGroup: () => void;
  onDeleteEntry: (entry: HistoryEntry) => void;
  onPin: (entry: HistoryEntry, pinned: boolean) => void;
  onLabel: (entry: HistoryEntry, label: string) => void;
  onCreateMock: (entry: HistoryEntry) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <div className="group/hdr flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-1)] border-b border-[var(--border)] sticky top-0">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-1.5 flex-1 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider hover:text-[var(--text-1)]"
        >
          {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          {label}
          <span className="ml-1 normal-case font-normal">{entries.length}</span>
        </button>
        {label !== "Pinned" && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteGroup();
            }}
            className="opacity-0 group-hover/hdr:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
            title={`Delete all ${label}`}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
      {expanded &&
        entries.map((entry, index) => (
          <HistoryItem
            key={entry.id ?? index}
            entry={entry}
            restore={restore}
            onDelete={onDeleteEntry}
            onPin={onPin}
            onLabel={onLabel}
            onCreateMock={onCreateMock}
          />
        ))}
    </div>
  );
}
