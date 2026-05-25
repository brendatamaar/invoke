import { useState } from "react";
import { useStore } from "../../../store";
import type { GrpcTab } from "../types";
import { GrpcMethodPicker } from "./GrpcMethodPicker";
import { GrpcRequestTabs } from "./GrpcRequestTabs";
import { GrpcStreamComposer } from "./GrpcStreamComposer";

export function GRPCClient() {
  const {
    grpcRequest,
    setGrpcRequest,
    grpcMethods,
    grpcStreaming,
    grpcStreamId,
  } = useStore();
  const [activeTab, setActiveTab] = useState<GrpcTab>("message");

  const selectedMethod = grpcMethods.find(
    (m) => m.service === grpcRequest.service && m.method === grpcRequest.method,
  );
  const isClientStream = selectedMethod?.clientStreaming ?? false;

  return (
    <div className="flex flex-col h-full gap-0">
      {grpcMethods.length > 0 && (
        <GrpcMethodPicker
          methods={grpcMethods}
          selectedService={grpcRequest.service ?? ""}
          selectedMethod={grpcRequest.method ?? ""}
          onSelect={(service, method) => setGrpcRequest({ service, method })}
        />
      )}

      <GrpcRequestTabs
        activeTab={activeTab}
        isClientStream={isClientStream}
        grpcStreamId={grpcStreamId}
        onSelectTab={setActiveTab}
      />

      {isClientStream && grpcStreamId && (
        <GrpcStreamComposer streamId={grpcStreamId} />
      )}

      {isClientStream && !grpcStreamId && !grpcStreaming && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-2xs text-[var(--text-3)]">
            Click Call to open the stream.
          </p>
        </div>
      )}
    </div>
  );
}
