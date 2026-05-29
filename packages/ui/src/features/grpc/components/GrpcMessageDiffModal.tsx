import { useMemo } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import { compareResponses } from "@invoke/core";
import { CodeEditor } from "../../../components/editors/CodeEditor";

function fakeResponse(body: string) {
  return {
    status: 200,
    statusText: "OK",
    headers: [] as { key: string; value: string }[],
    body,
    timing: { dnsMs: 0, tcpMs: 0, tlsMs: 0, ttfbMs: 0, transferMs: 0, totalMs: 0 },
    requestSize: 0,
    responseSize: 0,
  };
}

export function GrpcMessageDiffModal({
  left,
  right,
  leftLabel,
  rightLabel,
  onClose,
}: {
  left: string;
  right: string;
  leftLabel: string;
  rightLabel: string;
  onClose: () => void;
}) {
  const diff = useMemo(
    () => compareResponses(fakeResponse(left), fakeResponse(right)),
    [left, right],
  );

  const changedPaths = useMemo(
    () => [...new Set(diff.changes.map((c) => c.path))].slice(0, 12),
    [diff.changes],
  );

  const { additions, deletions, changes } = diff.summary;
  const hasChanges = additions + deletions + changes > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: "90vw", maxHeight: "90vh", minHeight: "50vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
          <ArrowLeftRight size={14} className="text-[var(--accent)] shrink-0" />
          <span className="text-sm font-semibold">Compare Messages</span>
          <div className="flex items-center gap-2 ml-auto text-2xs">
            {hasChanges ? (
              <>
                {additions > 0 && <span className="text-[var(--ok)] font-mono">+{additions}</span>}
                {deletions > 0 && (
                  <span className="text-[var(--danger)] font-mono">-{deletions}</span>
                )}
                {changes > 0 && (
                  <span className="text-yellow-600 font-mono dark:text-yellow-400">~{changes}</span>
                )}
              </>
            ) : (
              <span className="text-[var(--text-3)]">No differences</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Changed paths strip */}
        {changedPaths.length > 0 && (
          <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] flex flex-wrap gap-1 items-center shrink-0">
            <span className="text-2xs text-[var(--text-3)] shrink-0">Changed:</span>
            {changedPaths.map((path) => (
              <span
                key={path}
                className="text-2xs font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)]"
              >
                {path}
              </span>
            ))}
          </div>
        )}

        {/* Panel labels */}
        <div className="flex border-b border-[var(--border)] shrink-0">
          <div className="flex-1 flex items-center gap-2 px-4 py-1.5 bg-[var(--surface-2)] border-r border-[var(--border)]">
            <span className="text-2xs font-semibold text-[var(--text-2)]">{leftLabel}</span>
          </div>
          <div className="flex-1 flex items-center gap-2 px-4 py-1.5 bg-[var(--surface-2)]">
            <span className="text-2xs font-semibold text-[var(--text-2)]">{rightLabel}</span>
          </div>
        </div>

        {/* Side-by-side editors */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden border-r border-[var(--border)]">
            <CodeEditor
              value={diff.leftText}
              lang={diff.mode === "json" ? "json" : "text"}
              readOnly
              minHeight="100%"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor
              value={diff.rightText}
              lang={diff.mode === "json" ? "json" : "text"}
              readOnly
              minHeight="100%"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
