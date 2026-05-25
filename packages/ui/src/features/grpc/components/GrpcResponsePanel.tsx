import { CheckCircle2, XCircle } from "lucide-react";
import type { GrpcExecuteResponse } from "@invoke/core";
import { useStore } from "../../../store";

export function GrpcResponsePanel({ res }: { res: GrpcExecuteResponse }) {
  const { grpcAssertionResults } = useStore();
  const statusName =
    res.statusCode === 0 ? "OK" : (res.statusMessage ?? String(res.statusCode));
  const isOk = !res.error && res.statusCode === 0;

  return (
    <div
      className="border-t border-[var(--border)] flex flex-col"
      style={{ maxHeight: 320 }}
    >
      <div className="px-3 py-1 text-2xs border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2">
        <span
          className={`font-semibold ${isOk ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
        >
          {res.statusCode} {statusName}
        </span>
        {res.durationMs != null && (
          <span className="text-[var(--text-3)]">
            {res.durationMs.toFixed(0)}ms
          </span>
        )}
        {grpcAssertionResults.length > 0 && (
          <span
            className={`ml-auto text-2xs font-semibold ${grpcAssertionResults.every((r) => r.passed) ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
          >
            {grpcAssertionResults.filter((r) => r.passed).length}/
            {grpcAssertionResults.length} assertions
          </span>
        )}
      </div>
      <div className="overflow-y-auto flex-1">
        {res.bodyJson && (
          <pre className="p-2 text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all">
            {res.bodyJson}
          </pre>
        )}
        {res.error && !res.bodyJson && (
          <p className="p-2 text-2xs text-[var(--danger)]">{res.error}</p>
        )}
        {(res as any).statusDetailsJson && (
          <div className="border-t border-[var(--border)] px-3 py-1.5">
            <p className="text-2xs font-semibold text-[var(--text-2)] mb-1">
              Error details
            </p>
            <pre className="text-2xs font-mono text-[var(--danger)] whitespace-pre-wrap break-all">
              {(res as any).statusDetailsJson}
            </pre>
          </div>
        )}
        {(res.metadata?.length > 0 || res.trailers?.length > 0) && (
          <div className="border-t border-[var(--border)] px-3 py-1 text-2xs text-[var(--text-3)]">
            {res.metadata?.map((h, i) => (
              <div key={`md-${i}`}>
                <span className="font-mono">{h.key}:</span> {h.value}
              </div>
            ))}
            {res.trailers?.map((h, i) => (
              <div key={`tr-${i}`}>
                <span className="font-mono text-[var(--text-2)]">
                  {h.key} (trailer):
                </span>{" "}
                {h.value}
              </div>
            ))}
          </div>
        )}
        {grpcAssertionResults.length > 0 && (
          <div className="border-t border-[var(--border)] px-3 py-1 flex flex-col gap-1">
            {grpcAssertionResults.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-2xs">
                {r.passed ? (
                  <CheckCircle2
                    size={11}
                    className="text-[var(--ok)] shrink-0"
                  />
                ) : (
                  <XCircle
                    size={11}
                    className="text-[var(--danger)] shrink-0"
                  />
                )}
                <span
                  className={
                    r.passed ? "text-[var(--ok)]" : "text-[var(--danger)]"
                  }
                >
                  {r.message ?? (r.passed ? "passed" : "failed")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
