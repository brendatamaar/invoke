import type { WebSocketLogItem } from "../../../types";
import type { DirectionFilter } from "../types";
import { WebSocketLogEntry } from "./WebSocketLogEntry";

export function WebSocketLogList({
  entries,
  prettyJson,
  expandedIds,
  diffSelected,
  search,
  dirFilter,
  websocketState,
  onToggleExpanded,
  onToggleDiff,
}: {
  entries: WebSocketLogItem[];
  prettyJson: boolean;
  expandedIds: Set<string>;
  diffSelected: string[];
  search: string;
  dirFilter: DirectionFilter;
  websocketState: string;
  onToggleExpanded: (id: string) => void;
  onToggleDiff: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto font-mono text-2xs p-2 flex flex-col gap-1">
      {entries.map((entry) => (
        <WebSocketLogEntry
          key={entry.id}
          entry={entry}
          prettyJson={prettyJson}
          expanded={expandedIds.has(entry.id)}
          selectedForDiff={diffSelected.includes(entry.id)}
          onToggleExpanded={() => onToggleExpanded(entry.id)}
          onToggleDiff={() => onToggleDiff(entry.id)}
        />
      ))}
      {!entries.length && (
        <p className="text-[var(--text-3)] text-center mt-8 text-2xs">
          {search || dirFilter !== "all"
            ? "No matching messages"
            : websocketState === "disconnected"
              ? "Not connected"
              : "No messages"}
        </p>
      )}
    </div>
  );
}
