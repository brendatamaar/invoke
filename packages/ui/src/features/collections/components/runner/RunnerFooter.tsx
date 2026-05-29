import { Download, Play, StopCircle } from "lucide-react";
import { exportRunResultCsv, exportRunResultJson, type CollectionRunResult } from "@invoke/core";
import { downloadText } from "../../utils/download";

export function RunnerFooter({
  runResult,
  running,
  canRun,
  onCancel,
  onRun,
  onRunAgain,
}: {
  runResult?: CollectionRunResult | null;
  running: boolean;
  canRun: boolean;
  onCancel: () => void;
  onRun: () => void;
  onRunAgain: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border)]">
      {runResult && (
        <div className="flex items-center gap-3 mr-auto">
          <span
            className={`text-xs font-semibold ${runResult.status === "passed" ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
          >
            {runResult.passedCount}/{runResult.results.length} passed
          </span>
          <span className="text-2xs text-[var(--text-3)]">
            {runResult.completedAt - runResult.startedAt}ms total
          </span>
          <ExportButton
            label="JSON"
            onClick={() => {
              const ts = String(runResult.completedAt ?? runResult.startedAt);
              downloadText(exportRunResultJson(runResult), `run-${ts}.json`, "application/json");
            }}
          />
          <ExportButton
            label="CSV"
            onClick={() => {
              const ts = String(runResult.completedAt ?? runResult.startedAt);
              downloadText(exportRunResultCsv(runResult), `run-${ts}.csv`, "text/csv");
            }}
          />
        </div>
      )}
      {!runResult && <div className="mr-auto" />}
      {running ? (
        <button type="button" onClick={onCancel} className="btn btn-danger text-xs flex items-center gap-1.5">
          <StopCircle size={13} /> Cancel
        </button>
      ) : (
        <button
          type="button"
          onClick={runResult ? onRunAgain : onRun}
          disabled={!canRun}
          className="btn btn-primary text-xs flex items-center gap-1.5"
        >
          <Play size={13} /> {runResult ? "Run again" : "Run"}
        </button>
      )}
    </div>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn text-2xs py-0.5 px-2 flex items-center gap-1">
      <Download size={11} /> {label}
    </button>
  );
}
