import { Copy, FileText, Search, Trash2, X } from "lucide-react";
import { Select } from "../../../components/shared/Select";
import type { DirectionFilter } from "../types";

export function WebSocketLogToolbar({
  search,
  dirFilter,
  prettyJson,
  onSearch,
  onDirectionFilter,
  onPrettyJson,
  onCopyAll,
  onClearLog,
}: {
  search: string;
  dirFilter: DirectionFilter;
  prettyJson: boolean;
  onSearch: (value: string) => void;
  onDirectionFilter: (value: DirectionFilter) => void;
  onPrettyJson: () => void;
  onCopyAll: () => void;
  onClearLog: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-[var(--border)] shrink-0">
      <div className="flex items-center gap-1 flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-0.5">
        <Search size={10} className="text-[var(--text-3)] shrink-0" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search messages..."
          className="bg-transparent text-2xs text-[var(--text-1)] placeholder-[var(--text-3)] outline-none w-full"
        />
        {search && (
          <button
            onClick={() => onSearch("")}
            className="text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            <X size={10} />
          </button>
        )}
      </div>

      <Select
        value={dirFilter}
        onChange={(e) => onDirectionFilter(e.target.value as DirectionFilter)}
        size="2xs"
      >
        <option value="all">All</option>
        <option value="sent">Sent</option>
        <option value="received">Received</option>
        <option value="system">System</option>
      </Select>

      <button
        onClick={onPrettyJson}
        title="Toggle JSON pretty-print"
        className={`p-1 rounded ${prettyJson ? "text-[var(--accent)] bg-[var(--accent-muted,#dbeafe)]" : "text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
      >
        <FileText size={13} />
      </button>
      <button
        onClick={onCopyAll}
        title="Copy all"
        className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] rounded"
      >
        <Copy size={13} />
      </button>
      <button
        onClick={onClearLog}
        title="Clear log"
        className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] rounded"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
