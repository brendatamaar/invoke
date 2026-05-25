import { compareResponses, type HistoryEntry } from "@invoke/core";
import { CodeEditor } from "../../../../components/editors/CodeEditor";
import { StatusBadge } from "../../../../components/shared/StatusBadge";

type DiffResult = ReturnType<typeof compareResponses>;

export function DiffBody({
  diff,
  leftEntry,
  rightEntry,
  onAddIgnorePath,
}: {
  diff: DiffResult | null;
  leftEntry: HistoryEntry | undefined;
  rightEntry: HistoryEntry | undefined;
  onAddIgnorePath: (path: string) => void;
}) {
  return (
    <div className="flex-1 overflow-hidden flex">
      {diff ? (
        <div className="flex flex-1 overflow-hidden flex-col">
          {diff.changes.length > 0 && (
            <ChangedPathStrip diff={diff} onAddIgnorePath={onAddIgnorePath} />
          )}
          <div className="flex flex-1 overflow-hidden">
            <DiffPane
              label="Baseline"
              text={diff.leftText}
              mode={diff.mode}
              status={leftEntry?.response?.status}
              border
            />
            <DiffPane
              label="Comparison"
              text={diff.rightText}
              mode={diff.mode}
              status={rightEntry?.response?.status}
              summary={diff.summary}
              responseTimeDeltaMs={diff.responseTimeDeltaMs}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-3)]">
          Select two responses to compare
        </div>
      )}
    </div>
  );
}

function ChangedPathStrip({
  diff,
  onAddIgnorePath,
}: {
  diff: DiffResult;
  onAddIgnorePath: (path: string) => void;
}) {
  return (
    <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] flex flex-wrap gap-1 items-center">
      <span className="text-2xs text-[var(--text-3)] shrink-0">
        Changed paths:
      </span>
      {[...new Set(diff.changes.map((change) => change.path))]
        .slice(0, 12)
        .map((path) => (
          <button
            key={path}
            onClick={() => onAddIgnorePath(path)}
            className="text-2xs font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            title="Click to ignore this path"
          >
            {path}
          </button>
        ))}
    </div>
  );
}

function DiffPane({
  label,
  text,
  mode,
  status,
  summary,
  responseTimeDeltaMs,
  border,
}: {
  label: string;
  text: string;
  mode: DiffResult["mode"];
  status: number | undefined;
  summary?: DiffResult["summary"];
  responseTimeDeltaMs?: number;
  border?: boolean;
}) {
  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden ${border ? "border-r border-[var(--border)]" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
        {status && <StatusBadge status={status} />}
        <span className="text-2xs text-[var(--text-3)]">{label}</span>
        {summary && (
          <DiffSummary summary={summary} responseTimeDeltaMs={responseTimeDeltaMs ?? 0} />
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <CodeEditor value={text} lang={mode === "json" ? "json" : "text"} readOnly />
      </div>
    </div>
  );
}

function DiffSummary({
  summary,
  responseTimeDeltaMs,
}: {
  summary: DiffResult["summary"];
  responseTimeDeltaMs: number;
}) {
  return (
    <span className="ml-auto text-2xs flex items-center gap-2">
      <span className="text-[var(--ok)]">+{summary.additions}</span>
      <span className="text-[var(--danger)]">-{summary.deletions}</span>
      {summary.changes > 0 && (
        <span className="text-yellow-600">~{summary.changes}</span>
      )}
      {responseTimeDeltaMs !== 0 && (
        <span
          className={`font-mono ${responseTimeDeltaMs > 0 ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
        >
          {responseTimeDeltaMs > 0 ? "+" : ""}
          {responseTimeDeltaMs}ms
        </span>
      )}
    </span>
  );
}
