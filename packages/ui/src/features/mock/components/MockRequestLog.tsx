import { useState } from "react";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { MockLogEntry } from "@invoke/core";
import { MethodBadge } from "../../../components/shared/MethodBadge";
import { formatTime } from "../mockRouteUtils";

function statusColor(status: number) {
  if (status >= 400) return "text-[var(--danger)]";
  if (status >= 300) return "text-[var(--warn)]";
  return "text-[var(--ok)]";
}

function LogDetail({ log }: { log: MockLogEntry }) {
  const enabledHeaders = log.headers.filter((h) => h.enabled !== false);
  return (
    <div className="px-3 pb-2 pt-1 bg-[var(--surface-2)] border-b border-[var(--border)] text-2xs space-y-2">
      {enabledHeaders.length > 0 && (
        <div>
          <p className="text-[var(--text-3)] font-semibold uppercase tracking-wider mb-1">
            Request Headers
          </p>
          <div className="space-y-0.5">
            {enabledHeaders.map((h, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[var(--text-3)] shrink-0">{h.key}:</span>
                <span className="text-[var(--text-1)] break-all">{h.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {log.body ? (
        <div>
          <p className="text-[var(--text-3)] font-semibold uppercase tracking-wider mb-1">
            Request Body
          </p>
          <pre className="text-[var(--text-1)] whitespace-pre-wrap break-all font-mono">
            {log.body}
          </pre>
        </div>
      ) : (
        <p className="text-[var(--text-3)] italic">No body</p>
      )}
    </div>
  );
}

export function MockRequestLog({
  logs,
  totalLogs,
  onClear,
}: {
  logs: MockLogEntry[];
  totalLogs: number;
  onClear: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const countLabel = totalLogs > logs.length ? `${logs.length} of ${totalLogs}` : String(totalLogs);

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Request Log {totalLogs > 0 && `- ${countLabel}`}
        </span>
        {totalLogs > 0 && (
          <button
            onClick={onClear}
            className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="text-2xs">
        {logs.map((log) => (
          <div key={log.id}>
            <div
              className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] cursor-pointer"
              onClick={() => toggle(log.id)}
            >
              <span className="text-[var(--text-3)] shrink-0">
                {expandedId === log.id ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              </span>
              <span className="text-[var(--text-3)] shrink-0">{formatTime(log.createdAt)}</span>
              <MethodBadge method={log.method} />
              <span className="flex-1 text-[var(--text-1)] truncate">{log.path}</span>
              <span className={`shrink-0 font-semibold ${statusColor(log.status)}`}>
                {log.status}
              </span>
            </div>
            {expandedId === log.id && <LogDetail log={log} />}
          </div>
        ))}
        {!logs.length && (
          <p className="p-4 text-xs text-[var(--text-3)] text-center">No requests yet</p>
        )}
      </div>
    </>
  );
}
