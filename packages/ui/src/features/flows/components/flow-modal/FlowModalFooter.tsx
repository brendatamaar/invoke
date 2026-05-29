import { Play, Square } from "lucide-react";

export function FlowModalFooter({
  running,
  onClose,
  onSave,
  onRun,
  onStop,
}: {
  running: boolean;
  onClose: () => void;
  onSave: () => void;
  onRun: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-2)] shrink-0">
      <button type="button" onClick={onClose} className="btn text-xs">
        Close
      </button>
      <button type="button" onClick={onSave} className="btn text-xs">
        Save
      </button>
      {running ? (
        <button type="button" onClick={onStop} className="btn btn-danger text-xs flex items-center gap-1.5">
          <Square size={12} />
          Stop
        </button>
      ) : (
        <button type="button" onClick={onRun} className="btn btn-primary text-xs flex items-center gap-1.5">
          <Play size={12} />
          Run
        </button>
      )}
    </div>
  );
}
