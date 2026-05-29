import { ChevronDown, ChevronRight } from "lucide-react";
import { MethodBadge } from "../../../../components/shared/MethodBadge";
import type { WebhookEntry } from "../../../../types";
import { formatTime } from "../../mockRouteUtils";

export function HistoryLogEntry({
  entry,
  expanded,
  hasValidation,
  onToggle,
}: {
  entry: WebhookEntry;
  expanded: boolean;
  hasValidation: boolean;
  onToggle: () => void;
}) {
  const passed = entry.validationPassed;
  return (
    <div
      style={{
        border: "1px solid var(--line-1)",
        borderRadius: "var(--r-3)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-2 cursor-pointer w-full text-left"
        style={{ background: expanded ? "var(--bg-3)" : undefined }}
        onMouseEnter={(event) => {
          if (!expanded) (event.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
        }}
        onMouseLeave={(event) => {
          if (!expanded) (event.currentTarget as HTMLButtonElement).style.background = "";
        }}
        onClick={onToggle}
      >
        <span style={{ color: "var(--fg-3)", flexShrink: 0 }}>
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </span>
        <span className="font-mono shrink-0" style={{ fontSize: 12, color: "var(--fg-3)" }}>
          {formatTime(entry.createdAt)}
        </span>
        <MethodBadge method={entry.method} />
        <span className="flex-1" />
        {hasValidation && (
          <span
            className="font-mono shrink-0"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: passed ? "var(--ok)" : "var(--danger)",
            }}
            title={entry.validationError ?? "OK"}
          >
            {passed ? "OK" : "FAIL"}
          </span>
        )}
        {!passed && entry.validationError && (
          <span
            className="font-mono text-[var(--danger)] truncate"
            style={{ fontSize: 12, maxWidth: 160 }}
          >
            {entry.validationError}
          </span>
        )}
      </button>
      {expanded && <HistoryLogDetails entry={entry} />}
    </div>
  );
}

function HistoryLogDetails({ entry }: { entry: WebhookEntry }) {
  const headers = entry.headers.filter((header) => header.enabled !== false);
  return (
    <div
      className="flex flex-col gap-3 p-3"
      style={{ borderTop: "1px solid var(--line-1)", background: "var(--bg-1)" }}
    >
      {headers.length > 0 && (
        <div>
          <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
            Headers
          </p>
          <div className="flex flex-col gap-0.5">
            {headers.map((header) => (
              <div key={header.key} className="flex gap-2 font-mono text-xs">
                <span className="text-[var(--text-3)] shrink-0">{header.key}:</span>
                <span className="text-[var(--text-1)] break-all">{header.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {entry.body && (
        <div>
          <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
            Body
          </p>
          <pre
            className="font-mono text-xs text-[var(--text-1)] whitespace-pre-wrap break-all rounded p-2"
            style={{ background: "var(--bg-3)" }}
          >
            {entry.body}
          </pre>
        </div>
      )}
    </div>
  );
}
