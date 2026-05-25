import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
} from "lucide-react";
import type { WebSocketLogItem } from "../../../types";
import { useStore } from "../../../store";
import { byteSize, tryPrettyJson } from "../utils/log";

export function WebSocketLogEntry({
  entry,
  prettyJson,
  expanded,
  selectedForDiff,
  onToggleExpanded,
  onToggleDiff,
}: {
  entry: WebSocketLogItem;
  prettyJson: boolean;
  expanded: boolean;
  selectedForDiff: boolean;
  onToggleExpanded: () => void;
  onToggleDiff: () => void;
}) {
  const displayBody = prettyJson
    ? (tryPrettyJson(entry.body) ?? entry.body)
    : entry.body;

  return (
    <div
      className={`rounded ${
        entry.direction === "sent"
          ? "bg-[var(--info-bg)]"
          : entry.direction === "system"
            ? "bg-[var(--warn-bg)]"
            : "bg-[var(--surface-2)]"
      }`}
    >
      <div className="flex items-start gap-2 p-1.5">
        <input
          type="checkbox"
          checked={selectedForDiff}
          onChange={onToggleDiff}
          title="Select for diff"
          className="mt-0.5 shrink-0 accent-[var(--accent)] cursor-pointer"
          style={{ width: 11, height: 11 }}
        />
        <button
          onClick={onToggleExpanded}
          className="mt-0.5 shrink-0 text-[var(--text-3)] hover:text-[var(--text-1)]"
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
        <DirectionIcon direction={entry.direction} />
        <pre className="flex-1 break-all whitespace-pre-wrap text-[var(--text-1)] font-mono">
          {displayBody}
        </pre>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {entry.type === "binary" && (
            <span className="text-[8px] uppercase text-[var(--text-3)] bg-[var(--surface-3,#e5e7eb)] rounded px-1">
              bin
            </span>
          )}
          <span className="text-[var(--text-3)]">
            {new Date(entry.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </div>
      </div>
      {expanded && <WebSocketLogMetadata entry={entry} />}
    </div>
  );
}

function DirectionIcon({ direction }: { direction: WebSocketLogItem["direction"] }) {
  if (direction === "sent") {
    return <ArrowUp size={11} className="text-[var(--info)] mt-0.5 shrink-0" />;
  }

  if (direction === "system") {
    return <Info size={11} className="text-[var(--warn)] mt-0.5 shrink-0" />;
  }

  return <ArrowDown size={11} className="text-[var(--ok)] mt-0.5 shrink-0" />;
}

function WebSocketLogMetadata({ entry }: { entry: WebSocketLogItem }) {
  return (
    <div className="px-7 pb-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-[var(--text-3)] border-t border-[var(--border)]">
      <span>
        type: <span className="text-[var(--text-2)]">{entry.type}</span>
      </span>
      <span>
        direction:{" "}
        <span className="text-[var(--text-2)]">{entry.direction}</span>
      </span>
      <span>
        size: <span className="text-[var(--text-2)]">{byteSize(entry.body)} B</span>
      </span>
      <span>
        timestamp:{" "}
        <span className="text-[var(--text-2)]">
          {new Date(entry.createdAt).toISOString()}
        </span>
      </span>
      <button
        onClick={() =>
          navigator.clipboard.writeText(entry.body).catch((error: unknown) =>
            useStore
              .getState()
              .addToast(
                "error",
                `Copy failed: ${error instanceof Error ? error.message : String(error)}`,
              ),
          )
        }
        className="flex items-center gap-0.5 hover:text-[var(--text-1)] transition-colors"
      >
        <Copy size={9} /> copy
      </button>
    </div>
  );
}
