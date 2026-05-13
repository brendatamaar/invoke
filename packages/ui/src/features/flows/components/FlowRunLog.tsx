import type { FlowResult } from "@invoke/core";

export function FlowRunLog({
  flowLog,
  flowResult,
}: {
  flowLog: string[];
  flowResult: FlowResult | undefined;
}) {
  if (!flowLog.length && !flowResult) return null;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface-2)] shrink-0 max-h-36 overflow-y-auto px-4 py-3 font-mono text-2xs flex flex-col gap-0.5">
      {flowLog.map((line, i) => (
        <span
          key={i}
          className={
            line.startsWith("OK")
              ? "text-[var(--ok)]"
              : line.startsWith("ERR")
                ? "text-[var(--danger)]"
                : "text-[var(--text-2)]"
          }
        >
          {line}
        </span>
      ))}
      {flowResult && (
        <div
          className={`mt-1 p-1.5 rounded text-xs font-sans ${flowResult.status === "passed" ? "bg-[var(--ok-bg)] text-[var(--ok)]" : "bg-[var(--danger-bg)] text-[var(--danger)]"}`}
        >
          Flow {flowResult.status} in{" "}
          {flowResult.completedAt - flowResult.startedAt}ms
        </div>
      )}
    </div>
  );
}
