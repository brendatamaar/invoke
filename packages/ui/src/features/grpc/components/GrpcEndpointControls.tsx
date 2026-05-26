import { Activity, Heart, Loader2, RefreshCw } from "lucide-react";
import { GrpcCallControls } from "./GrpcCallControls";

export function GrpcEndpointControls({
  address,
  tls,
  latencyMs,
  grpcStreamId,
  grpcStreaming,
  isExecuting,
  isClientStream,
  onAddressChange,
  onTlsChange,
  isReflecting,
  isProtosetLoaded,
  onReflect,
  onHealthCheck,
  onCloseStream,
  onCancelStream,
  onCancelExecute,
  onExecute,
}: {
  address?: string;
  tls: boolean;
  latencyMs?: number;
  grpcStreamId?: string;
  grpcStreaming: boolean;
  isExecuting: boolean;
  isClientStream: boolean;
  onAddressChange: (address: string) => void;
  onTlsChange: (tls: boolean) => void;
  isReflecting?: boolean;
  isProtosetLoaded?: boolean;
  onReflect: () => void;
  onHealthCheck: () => void;
  onCloseStream: () => void;
  onCancelStream: () => void;
  onCancelExecute: () => void;
  onExecute: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <input
        value={address}
        onChange={(event) => onAddressChange(event.target.value)}
        placeholder="grpc.example.com:443"
        className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
      />
      <label className="flex items-center gap-1 text-xs text-[var(--text-2)] shrink-0 cursor-pointer">
        <input
          type="checkbox"
          checked={tls}
          onChange={(event) => onTlsChange(event.target.checked)}
        />
        TLS
      </label>
      <button
        onClick={onReflect}
        disabled={isReflecting || isProtosetLoaded}
        className="btn text-xs gap-1"
        title={isProtosetLoaded ? "Protoset active — server reflection disabled" : "Reflect (Ctrl+Shift+R)"}
      >
        {isReflecting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Reflect
      </button>
      <button
        onClick={onHealthCheck}
        className="btn text-xs gap-1"
        title="grpc.health.v1.Health/Check - measures RTT"
      >
        <Heart size={12} /> Health
      </button>
      {latencyMs !== undefined && (
        <span
          title="Round-trip latency from last Health/Check"
          className="flex items-center gap-1 text-2xs text-[var(--ok)] font-mono shrink-0"
        >
          <Activity size={10} />
          {latencyMs}ms
        </span>
      )}
      <GrpcCallControls
        grpcStreamId={grpcStreamId}
        grpcStreaming={grpcStreaming}
        isExecuting={isExecuting}
        isClientStream={isClientStream}
        onCloseStream={onCloseStream}
        onCancelStream={onCancelStream}
        onCancelExecute={onCancelExecute}
        onExecute={onExecute}
      />
    </div>
  );
}
