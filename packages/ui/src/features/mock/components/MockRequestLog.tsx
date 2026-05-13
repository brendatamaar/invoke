import { Trash2 } from "lucide-react";
import type { MockLogEntry } from "@invoke/core";
import { MethodBadge } from "../../../components/shared/MethodBadge";
import { formatTime } from "./mockRouteUtils";

export function MockRequestLog({
  logs,
  onClear,
}: {
  logs: MockLogEntry[];
  onClear: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Request Log {logs.length > 0 && `- ${logs.length}`}
        </span>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="font-mono text-2xs">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
          >
            <span className="text-[var(--text-3)] shrink-0">
              {formatTime(log.createdAt)}
            </span>
            <MethodBadge method={log.method} />
            <span className="flex-1 text-[var(--text-1)] truncate">
              {log.path}
            </span>
            <span
              className={`shrink-0 font-semibold ${log.status >= 400 ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
            >
              {log.status}
            </span>
            {!log.matched && (
              <span className="text-2xs text-[var(--warn)] shrink-0">
                unmatched
              </span>
            )}
          </div>
        ))}
        {!logs.length && (
          <p className="p-4 text-xs text-[var(--text-3)] text-center">
            No requests yet
          </p>
        )}
      </div>
    </>
  );
}
