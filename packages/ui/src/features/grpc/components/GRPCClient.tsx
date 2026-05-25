import { useState } from "react";
import { useStore } from "../../../store";
import type { GrpcTab } from "../types";
import { GrpcMessageDiffModal } from "./GrpcMessageDiffModal";
import { GrpcMethodPicker } from "./GrpcMethodPicker";
import { GrpcRequestTabs } from "./GrpcRequestTabs";
import { GrpcResponsePanel } from "./GrpcResponsePanel";
import { GrpcServerStreamMessages } from "./GrpcServerStreamMessages";
import { GrpcStatusBar } from "./GrpcStatusBar";
import { GrpcStreamComposer } from "./GrpcStreamComposer";

export function GRPCClient() {
  const {
    grpcRequest,
    setGrpcRequest,
    grpcMethods,
    grpcStatus,
    grpcStreaming,
    grpcStreamMessages,
    grpcResponse,
    grpcStreamId,
  } = useStore();
  const [activeTab, setActiveTab] = useState<GrpcTab>("message");
  const [diffLeft, setDiffLeft] = useState<string | null>(null);
  const [diffRight, setDiffRight] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const selectedMethod = grpcMethods.find(
    (m) => m.service === grpcRequest.service && m.method === grpcRequest.method,
  );
  const isServerStreaming =
    (selectedMethod?.serverStreaming ?? false) &&
    !selectedMethod?.clientStreaming;
  const isClientStream = selectedMethod?.clientStreaming ?? false;

  const selectForDiff = (body: string) => {
    if (!diffLeft) {
      setDiffLeft(body);
      return;
    }
    if (!diffRight) {
      setDiffRight(body);
      setShowDiff(true);
      return;
    }
    setDiffLeft(body);
    setDiffRight(null);
  };

  const resetDiff = () => {
    setDiffLeft(null);
    setDiffRight(null);
  };

  return (
    <div className="flex flex-col h-full gap-0">
      {showDiff && diffLeft && diffRight && (
        <GrpcMessageDiffModal
          left={diffLeft}
          right={diffRight}
          onClose={() => {
            setShowDiff(false);
            resetDiff();
          }}
        />
      )}

      {grpcStatus && <GrpcStatusBar status={grpcStatus} />}

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
            Click Invoke to open the stream.
          </p>
        </div>
      )}

      {isServerStreaming && (
        <GrpcServerStreamMessages
          grpcStreaming={grpcStreaming}
          messages={grpcStreamMessages}
          diffLeft={diffLeft}
          onResetDiff={resetDiff}
          onSelectForDiff={selectForDiff}
        />
      )}

      {grpcResponse && !isServerStreaming && !isClientStream && (
        <GrpcResponsePanel res={grpcResponse} />
      )}
    </div>
  );
}
