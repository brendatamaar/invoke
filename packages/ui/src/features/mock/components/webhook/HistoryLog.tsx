import { useState } from "react";
import { RefreshCw } from "lucide-react";
import type { WebhookEntry } from "../../../../types";
import { HistoryLogEntry } from "./HistoryLogEntry";

export function HistoryLog({
  entries,
  hasValidation,
  onClear,
  onRefresh,
  loadingLogs,
}: {
  entries: WebhookEntry[];
  hasValidation: boolean;
  onClear: () => void;
  onRefresh: () => void;
  loadingLogs: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xs text-[var(--text-3)]">
          {entries.length} {entries.length === 1 ? "request" : "requests"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className={`text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 transition-colors ${loadingLogs ? "animate-spin" : ""}`}
            title="Refresh"
          >
            <RefreshCw size={11} />
          </button>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-2xs text-[var(--text-3)] hover:text-[var(--danger)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-[var(--text-3)] text-center py-6">Waiting for requests…</p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((entry) => (
            <HistoryLogEntry
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              hasValidation={hasValidation}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
