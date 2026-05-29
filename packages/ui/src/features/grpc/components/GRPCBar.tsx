import { AlertTriangle } from "lucide-react";
import { useGrpcBar } from "../hooks/useGrpcBar";
import { GrpcEndpointControls } from "./GrpcEndpointControls";

export function GRPCBar() {
  const bar = useGrpcBar();
  return (
    <div className="flex flex-col gap-0">
      <GrpcEndpointControls
        address={bar.grpcRequest.address}
        tls={bar.grpcRequest.tls ?? false}
        latencyMs={bar.grpcLatencyMs}
        execution={{ streaming: bar.grpcStreaming, executing: bar.isExecuting, clientStream: bar.isClientStream, streamId: bar.grpcStreamId }}
        schema={{ reflecting: bar.isReflecting ?? false, protosetLoaded: bar.isProtosetLoaded ?? false }}
        onAddressChange={bar.setAddress}
        onTlsChange={bar.setTls}
        onReflect={bar.reflect}
        onHealthCheck={bar.healthCheck}
        onCloseStream={bar.closeStream}
        onCancelStream={bar.cancelStream}
        onCancelExecute={bar.cancelExecute}
        onExecute={bar.execute}
      />
      {bar.tlsLocalhostWarning && (
        <div className="px-3 pb-1 flex items-center gap-1 text-2xs text-[var(--warn)]">
          <AlertTriangle size={11} />
          TLS is enabled but the address looks like localhost - most local servers use plaintext.
        </div>
      )}
    </div>
  );
}
