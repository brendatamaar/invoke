import { StopCircle, Zap } from "lucide-react";

export function GrpcInvokeControls({
  grpcStreamId,
  grpcStreaming,
  isExecuting,
  isServerStreaming,
  isClientStream,
  onCloseStream,
  onCancelStream,
  onCancelExecute,
  onExecute,
}: {
  grpcStreamId?: string;
  grpcStreaming: boolean;
  isExecuting: boolean;
  isServerStreaming: boolean;
  isClientStream: boolean;
  onCloseStream: () => void;
  onCancelStream: () => void;
  onCancelExecute: () => void;
  onExecute: () => void;
}) {
  if (grpcStreamId) {
    return (
      <button
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
        onClick={onCancelExecute}
        className="btn btn-danger text-xs flex items-center gap-1"
      >
        <StopCircle size={12} /> Cancel
      </button>
    );
  }
  return (
    <button
      onClick={onExecute}
      className="btn btn-primary text-xs flex items-center gap-1"
      title={isClientStream ? "Open Stream (Ctrl+Enter)" : "Invoke (Ctrl+Enter)"}
    >
      {(isServerStreaming || isClientStream) && <Zap size={12} />}
      {isClientStream ? "Open Stream" : "Invoke"}
    </button>
  );
}
