import { Layers, RefreshCw, X, Zap } from "lucide-react";

export function URLBarActions({
  loading,
  streamMode,
  canCancel,
  canSend,
  onBatch,
  onToggleStream,
  onCancel,
  onSend,
}: {
  loading: boolean;
  streamMode: boolean;
  canCancel: boolean;
  canSend: boolean;
  onBatch: () => void;
  onToggleStream: () => void;
  onCancel: () => void;
  onSend: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onBatch}
        title="Batch runner"
        className="p-1.5 rounded border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
      >
        <Layers size={13} />
      </button>
      <button
        type="button"
        onClick={onToggleStream}
        title="Stream mode"
        className={`p-1.5 rounded border text-xs transition-colors ${streamMode ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)]"}`}
      >
        <Zap size={13} />
      </button>
      {loading && canCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-danger px-3 gap-1 text-xs"
          title="Cancel request"
        >
          <X size={13} /> Cancel
        </button>
      )}
      <button
        type="button"
        onClick={onSend}
        disabled={loading || !canSend}
        className="btn btn-primary px-4 gap-1.5 text-xs"
      >
        {loading ? <RefreshCw size={13} className="animate-spin" /> : null}
        {loading ? "Sending..." : "Send"}
      </button>
    </>
  );
}
