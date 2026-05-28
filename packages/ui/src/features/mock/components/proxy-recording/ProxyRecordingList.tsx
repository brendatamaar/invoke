import { CheckSquare, Square } from "lucide-react";
import type { ProxyRecord } from "../../../../types";
import { MethodBadge } from "../../../../components/shared/MethodBadge";
import { formatTime } from "../../mockRouteUtils";
import { StatusChip } from "./StatusChip";

export function ProxyRecordingList({
  records,
  selected,
  allSelected,
  someSelected,
  onToggleAll,
  onToggleSelect,
}: {
  records: ProxyRecord[];
  selected: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onToggleSelect: (id: string) => void;
}) {
  if (records.length === 0) {
    return (
      <p className="p-4 text-xs text-[var(--text-3)] text-center">No recorded requests yet.</p>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <button
          onClick={onToggleAll}
          className="text-[var(--text-3)] hover:text-[var(--accent)] shrink-0"
        >
          {allSelected ? (
            <CheckSquare size={11} className="text-[var(--accent)]" />
          ) : someSelected ? (
            <CheckSquare size={11} className="text-[var(--text-3)]" />
          ) : (
            <Square size={11} />
          )}
        </button>
        <span className="text-2xs text-[var(--text-3)]">
          {someSelected || allSelected ? `${selected.size} selected` : "Select all"}
        </span>
      </div>

      {records.map((record) => (
        <div
          key={record.id}
          onClick={() => onToggleSelect(record.id)}
          className={`flex items-center gap-2.5 px-3 py-2 border-b border-[var(--border)] last:border-0 cursor-pointer transition-colors ${selected.has(record.id) ? "bg-[var(--accent-subtle)]" : "hover:bg-[var(--surface-2)]"}`}
        >
          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect(record.id);
            }}
            className="shrink-0 text-[var(--text-3)]"
          >
            {selected.has(record.id) ? (
              <CheckSquare size={11} className="text-[var(--accent)]" />
            ) : (
              <Square size={11} />
            )}
          </button>
          <MethodBadge method={record.method} />
          <span
            className="flex-1 text-2xs font-mono text-[var(--text-1)] truncate"
            title={record.path}
          >
            {record.path}
          </span>
          <StatusChip status={record.status} />
          <span className="text-2xs text-[var(--text-3)] tabular-nums shrink-0">
            {formatTime(record.createdAt)}
          </span>
        </div>
      ))}
    </>
  );
}
