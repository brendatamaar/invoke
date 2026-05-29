import { CheckCircle2, SkipForward, XCircle } from "lucide-react";
import type { RequestRunResult, SavedRequest } from "@invoke/core";
import { MethodBadge } from "../../../../components/shared/MethodBadge";
import { protocolMethod } from "../../../../components/shared/methodUtils";
import { StatusBadge } from "../../../../components/shared/StatusBadge";

export function RunnerResults({
  runRequests,
  displayResults,
  running,
}: {
  runRequests: SavedRequest[];
  displayResults: RequestRunResult[];
  running: boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
      {runRequests.length === 0 && (
        <p className="p-6 text-xs text-[var(--text-3)] text-center">No requests in this target.</p>
      )}
      {displayResults.map((result, index) => (
        <ResultRow key={result.requestId ?? index} result={result} />
      ))}
      {running &&
        displayResults.length < runRequests.length &&
        runRequests.slice(displayResults.length).map((request) => (
          <div key={request.id} className="flex items-center gap-3 px-4 py-2.5 opacity-40">
            <SkipForward size={13} className="text-[var(--text-3)] shrink-0" />
            <MethodBadge
              method={protocolMethod(
                request.protocol,
                (request.request as { method?: string })?.method,
              )}
            />
            <span className="flex-1 text-xs truncate text-[var(--text-2)]">
              {request.name || (request.request as { url?: string })?.url}
            </span>
          </div>
        ))}
    </div>
  );
}

function ResultRow({ result }: { result: RequestRunResult }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {statusIcon(result.status)}
      <MethodBadge method={result.method} />
      <span className="flex-1 text-xs truncate text-[var(--text-1)]">
        {result.name || result.url}
      </span>
      {result.response && <StatusBadge status={result.response.status} />}
      <span className="text-2xs text-[var(--text-3)] w-14 text-right">
        {result.durationMs > 0 ? `${result.durationMs}ms` : ""}
      </span>
      {result.assertions && result.assertions.length > 0 && (
        <span
          className={`text-2xs ${result.assertions.every((item) => item.passed) ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
        >
          {result.assertions.filter((item) => item.passed).length}/{result.assertions.length}
        </span>
      )}
    </div>
  );
}

function statusIcon(status: RequestRunResult["status"]) {
  if (status === "passed") {
    return <CheckCircle2 size={13} className="text-[var(--ok)] shrink-0" />;
  }
  if (status === "failed" || status === "error") {
    return <XCircle size={13} className="text-[var(--danger)] shrink-0" />;
  }
  return <SkipForward size={13} className="text-[var(--text-3)] shrink-0" />;
}
