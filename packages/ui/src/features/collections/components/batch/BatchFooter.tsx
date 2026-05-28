import { StopCircle, Zap } from "lucide-react";

export function BatchFooter({
  running,
  hasResult,
  canRun,
  onCancel,
  onReset,
  onRun,
}: {
  running: boolean;
  hasResult: boolean;
  canRun: boolean;
  onCancel: () => void;
  onReset: () => void;
  onRun: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
      {running ? (
        <button onClick={onCancel} className="btn btn-danger text-xs flex items-center gap-1.5">
          <StopCircle size={13} /> Cancel
        </button>
      ) : (
        <>
          {hasResult && (
            <button onClick={onReset} className="btn text-xs">
              Reset
            </button>
          )}
          <button
            onClick={onRun}
            disabled={!canRun}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Zap size={13} /> {hasResult ? "Run again" : "Run"}
          </button>
        </>
      )}
    </div>
  );
}
