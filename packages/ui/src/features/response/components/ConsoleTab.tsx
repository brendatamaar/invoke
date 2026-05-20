import { AlertCircle, Terminal } from "lucide-react";
import { useStore } from "../../../store";

function LogSection({
  label,
  logs,
  error,
}: {
  label: string;
  logs: string[];
  error?: string;
}) {
  if (!logs.length && !error) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wide flex items-center gap-1">
        {label}
        {error && <AlertCircle size={10} className="text-[var(--danger)]" />}
      </span>
      {logs.length > 0 && (
        <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] p-2.5 flex flex-col gap-0.5">
          {logs.map((log, i) => (
            <div key={i} className="text-2xs font-mono text-[var(--text-1)] break-all">
              {log}
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="rounded border border-[var(--danger)] bg-[var(--danger-bg)] p-2.5">
          <div className="text-2xs font-mono text-[var(--danger)] break-all">{error}</div>
        </div>
      )}
    </div>
  );
}

export function ConsoleTab() {
  const { consoleLogs } = useStore();
  const hasContent =
    consoleLogs.preRequest.length > 0 ||
    consoleLogs.postResponse.length > 0 ||
    !!consoleLogs.preRequestError ||
    !!consoleLogs.postResponseError;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
        <Terminal size={18} className="text-[var(--text-3)]" />
        <p className="text-xs text-[var(--text-3)]">No console output</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <LogSection
        label="Pre-request"
        logs={consoleLogs.preRequest}
        error={consoleLogs.preRequestError}
      />
      <LogSection
        label="Post-response"
        logs={consoleLogs.postResponse}
        error={consoleLogs.postResponseError}
      />
    </div>
  );
}
