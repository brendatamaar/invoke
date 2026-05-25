import { useState, type ReactNode } from "react";
import { Code2 } from "lucide-react";
import { useStore } from "../../../store";
import { grpcMethodFlags, selectedGrpcMethod } from "../utils/protocolBar";
import { GrpcDeadlineCountdown } from "./GrpcDeadlineCountdown";
import { GrpcMessageDiffModal } from "./GrpcMessageDiffModal";
import { GrpcResponsePanel } from "./GrpcResponsePanel";
import { GrpcServerStreamMessages } from "./GrpcServerStreamMessages";
import { GrpcStatusBar } from "./GrpcStatusBar";
import { GrpcStreamTranscript } from "./GrpcStreamTranscript";

export function GrpcResponseViewer() {
  const {
    grpcMethods,
    grpcRequest,
    grpcStatus,
    grpcStreaming,
    grpcStreamMessages,
    grpcResponse,
    grpcExecuteController,
    grpcStreamId,
    grpcStreamSentMessages,
    grpcStreamReceivedMessages,
    set,
  } = useStore();
  const [diffLeft, setDiffLeft] = useState<string | null>(null);
  const [diffRight, setDiffRight] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const selectedMethod = selectedGrpcMethod(grpcMethods, grpcRequest);
  const { isServerStreaming, isClientStream } =
    grpcMethodFlags(selectedMethod);
  const isBidiStream =
    isClientStream && (selectedMethod?.serverStreaming ?? false);
  const hasClientStreamLog =
    isBidiStream ||
    (isClientStream && grpcStreaming) ||
    !!grpcStreamId ||
    grpcStreamSentMessages.length > 0 ||
    grpcStreamReceivedMessages.length > 0;
  const hasServerStreamLog =
    isServerStreaming ||
    (!isClientStream && grpcStreaming) ||
    grpcStreamMessages.length > 0;
  const hasClosedClientStreamResponse =
    isClientStream &&
    !isBidiStream &&
    !grpcStreamId &&
    !grpcStreaming &&
    !!grpcResponse;

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

  const clearClientStreamLog = () => {
    resetDiff();
    set({ grpcStreamSentMessages: [], grpcStreamReceivedMessages: [] });
  };

  const isPlaceholder =
    !hasClosedClientStreamResponse &&
    !hasClientStreamLog &&
    !hasServerStreamLog &&
    !grpcResponse;

  let content: ReactNode;
  if (hasClosedClientStreamResponse && grpcResponse) {
    content = <GrpcResponsePanel res={grpcResponse} />;
  } else if (hasClientStreamLog) {
    content = (
      <GrpcStreamTranscript
        grpcStreaming={grpcStreaming}
        sentMessages={grpcStreamSentMessages}
        receivedMessages={grpcStreamReceivedMessages}
        diffLeft={diffLeft}
        onClear={clearClientStreamLog}
        onResetDiff={resetDiff}
        onSelectForDiff={selectForDiff}
      />
    );
  } else if (hasServerStreamLog) {
    content = (
      <GrpcServerStreamMessages
        grpcStreaming={grpcStreaming}
        messages={grpcStreamMessages}
        diffLeft={diffLeft}
        onResetDiff={resetDiff}
        onSelectForDiff={selectForDiff}
      />
    );
  } else if (grpcResponse) {
    content = <GrpcResponsePanel res={grpcResponse} />;
  } else {
    content = <GrpcResponsePlaceholder active={!!grpcExecuteController} />;
  }

  return (
    <>
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
      <div className="flex flex-col h-full">
        {grpcStatus && isPlaceholder && <GrpcStatusBar status={grpcStatus} />}
        {content}
      </div>
    </>
  );
}

function GrpcResponsePlaceholder({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
      <div className="w-10 h-10 rounded bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-2">
        <Code2 size={18} className="text-[var(--text-3)]" />
      </div>
      <p className="text-sm text-[var(--text-2)] font-medium">No gRPC response yet</p>
      {active && (
        <div className="flex items-center gap-2 text-2xs text-[var(--text-3)]">
          <span className="text-[var(--accent)] animate-pulse">Working...</span>
          <GrpcDeadlineCountdown />
        </div>
      )}
    </div>
  );
}
