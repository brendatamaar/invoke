import { useEffect, useCallback, useReducer, useRef, useState, type ReactNode } from "react";
import { Code2 } from "lucide-react";
import { useStore } from "../../../store";
import { grpcMethodFlags, selectedGrpcMethod } from "../utils/protocolBar";
import { CodeTab } from "../../response/components/CodeTab";
import { GrpcDeadlineCountdown } from "./GrpcDeadlineCountdown";
import { GrpcMessageDiffModal } from "./GrpcMessageDiffModal";
import { GrpcResponsePanel } from "./GrpcResponsePanel";
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

  type ViewerState = {
    streamDiffSelected: number[];
    showStreamDiff: boolean;
    diffLeft: string | null;
    diffRight: string | null;
    showTranscriptDiff: boolean;
  };
  const [viewerState, viewerDispatch] = useReducer(
    (prev: ViewerState, patch: Partial<ViewerState>) => ({ ...prev, ...patch }),
    {
      streamDiffSelected: [],
      showStreamDiff: false,
      diffLeft: null,
      diffRight: null,
      showTranscriptDiff: false,
    },
  );
  const { streamDiffSelected, showStreamDiff, diffLeft, diffRight, showTranscriptDiff } =
    viewerState;
  const setStreamDiffSelected = (v: number[] | ((prev: number[]) => number[])) =>
    viewerDispatch({ streamDiffSelected: typeof v === "function" ? v(streamDiffSelected) : v });
  const setShowStreamDiff = (v: boolean) => viewerDispatch({ showStreamDiff: v });
  const setDiffLeft = (v: string | null) => viewerDispatch({ diffLeft: v });
  const setDiffRight = (v: string | null) => viewerDispatch({ diffRight: v });
  const setShowTranscriptDiff = (v: boolean) => viewerDispatch({ showTranscriptDiff: v });

  const selectedMethod = selectedGrpcMethod(grpcMethods, grpcRequest);
  const { isServerStreaming, isClientStream } = grpcMethodFlags(selectedMethod);
  const isBidiStream = isClientStream && (selectedMethod?.serverStreaming ?? false);
  const hasClientStreamLog =
    isBidiStream ||
    (isClientStream && grpcStreaming) ||
    !!grpcStreamId ||
    grpcStreamSentMessages.length > 0 ||
    grpcStreamReceivedMessages.length > 0;
  const hasServerStreamLog =
    isServerStreaming || (!isClientStream && grpcStreaming) || grpcStreamMessages.length > 0;
  const hasClosedClientStreamResponse =
    isClientStream && !isBidiStream && !grpcStreamId && !grpcStreaming && !!grpcResponse;

  const toggleStreamDiff = (i: number) => {
    setStreamDiffSelected((prev) => {
      if (prev.includes(i)) return prev.filter((x) => x !== i);
      if (prev.length >= 2) return [prev[1], i];
      return [...prev, i];
    });
  };

  const clearStreamDiff = useCallback(() => {
    viewerDispatch({ streamDiffSelected: [], showStreamDiff: false });
  }, [viewerDispatch]);

  const clearStreamMessages = useCallback(() => {
    clearStreamDiff();
    set({ grpcStreamMessages: [] });
  }, [clearStreamDiff, set]);

  const clearStreamMessagesRef = useRef(clearStreamMessages);
  clearStreamMessagesRef.current = clearStreamMessages;
  const hasServerStreamLogRef = useRef(hasServerStreamLog);
  hasServerStreamLogRef.current = hasServerStreamLog;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "l" && hasServerStreamLogRef.current) {
        e.preventDefault();
        clearStreamMessagesRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectForDiff = (body: string) => {
    if (!diffLeft) {
      setDiffLeft(body);
      return;
    }
    if (!diffRight) {
      setDiffRight(body);
      setShowTranscriptDiff(true);
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

  const [activeTab, setActiveTab] = useState<"response" | "code">("response");

  const isPlaceholder =
    !hasClosedClientStreamResponse && !hasClientStreamLog && !hasServerStreamLog && !grpcResponse;

  const firstArrival = grpcStreamMessages.find((m) => m.receivedAt)?.receivedAt;
  const streamDiffLabel = (i: number) => {
    const msg = grpcStreamMessages[i];
    if (!msg) return `#${i + 1}`;
    const relMs =
      firstArrival && msg.receivedAt && msg.receivedAt > firstArrival
        ? ` · +${msg.receivedAt - firstArrival}ms`
        : "";
    return `#${i + 1}${relMs}`;
  };

  let content: ReactNode;
  if (hasClosedClientStreamResponse && grpcResponse) {
    content = <GrpcResponsePanel mode="unary" res={grpcResponse} />;
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
      <GrpcResponsePanel
        mode="stream"
        grpcStreaming={grpcStreaming}
        messages={grpcStreamMessages}
        diffSelected={streamDiffSelected}
        onToggleDiff={toggleStreamDiff}
        onClearDiff={clearStreamDiff}
        onOpenDiff={() => setShowStreamDiff(true)}
        onClear={clearStreamMessages}
      />
    );
  } else if (grpcResponse) {
    content = <GrpcResponsePanel mode="unary" res={grpcResponse} />;
  } else {
    content = <GrpcResponsePlaceholder active={!!grpcExecuteController} />;
  }

  return (
    <>
      {showStreamDiff && streamDiffSelected.length === 2 && (
        <GrpcMessageDiffModal
          left={grpcStreamMessages[streamDiffSelected[0]]?.bodyJson ?? ""}
          right={grpcStreamMessages[streamDiffSelected[1]]?.bodyJson ?? ""}
          leftLabel={streamDiffLabel(streamDiffSelected[0])}
          rightLabel={streamDiffLabel(streamDiffSelected[1])}
          onClose={() => setShowStreamDiff(false)}
        />
      )}
      {showTranscriptDiff && diffLeft && diffRight && (
        <GrpcMessageDiffModal
          left={diffLeft}
          right={diffRight}
          leftLabel="Message A"
          rightLabel="Message B"
          onClose={() => {
            setShowTranscriptDiff(false);
            resetDiff();
          }}
        />
      )}
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)]">
          {(["response", "code"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`tab-btn text-2xs ${activeTab === tab ? "active" : ""}`}
            >
              {tab === "response" ? "Response" : "Code"}
            </button>
          ))}
        </div>
        {activeTab === "response" && (
          <>
            {grpcStatus && isPlaceholder && <GrpcStatusBar status={grpcStatus} />}
            {content}
          </>
        )}
        {activeTab === "code" && <CodeTab />}
      </div>
    </>
  );
}

function GrpcResponsePlaceholder({ active }: { active: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
      <div className="size-10 rounded bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-2">
        <Code2 size={18} className="text-[var(--text-3)]" />
      </div>
      <p className="text-sm text-[var(--text-2)] font-medium">No gRPC response yet</p>
      {active && (
        <div className="flex items-center gap-2 text-2xs text-[var(--text-3)]">
          <span className="text-[var(--accent)] animate-pulse">Working\u2026</span>
          <GrpcDeadlineCountdown />
        </div>
      )}
    </div>
  );
}
