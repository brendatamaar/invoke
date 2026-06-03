import { StopCircle, Zap } from "lucide-react";

export function GrpcCallControls({
  grpcStreamId,
  grpcStreaming,
  isExecuting,
  isClientStream,
  onCloseStream,
  onCancelStream,
  onCancelExecute,
  onExecute,
}: {
  grpcStreamId?: string;
  grpcStreaming: boolean;
  isExecuting: boolean;
  isClientStream: boolean;
  onCloseStream: () => void;
  onCancelStream: () => void;
  onCancelExecute: () => void;
  onExecute: () => void;
}) {
  if (grpcStreamId) {
    return (
      <button
        type="button"
        onClick={onCloseStream}
        className="btn btn-danger text-xs flex items-center gap-1"
      >
        <StopCircle size={12} /> Close Stream
      </button>
    );
  }
  if (grpcStreaming) {
    return (
      <button
        type="button"
        onClick={onCancelStream}
        className="btn btn-danger text-xs flex items-center gap-1"
      >
        <StopCircle size={12} /> Cancel
      </button>
    );
  }
  if (isExecuting) {
    return (
      <button
        type="button"
        onClick={onCancelExecute}
        className="btn btn-danger text-xs flex items-center gap-1"
      >
        <StopCircle size={12} /> Cancel
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onExecute}
      className="btn btn-primary text-xs flex items-center gap-1"
      title={isClientStream ? "Open Stream (Ctrl+Enter)" : "Call (Ctrl+Enter)"}
    >
      <Zap size={12} />
      {isClientStream ? "Open Stream" : "Call"}
    </button>
  );
}
