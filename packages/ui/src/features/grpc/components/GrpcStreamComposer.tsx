import { useEffect, useState } from "react";
import { useStore } from "../../../store";
import { grpcStreamSend } from "../api";
import { GrpcMessageDiffModal } from "./GrpcMessageDiffModal";
import { GrpcStreamMessageEditor } from "./GrpcStreamMessageEditor";
import { GrpcStreamTranscript } from "./GrpcStreamTranscript";

export function GrpcStreamComposer({ streamId }: { streamId: string }) {
  const {
    set,
    grpcRequest,
    setGrpcRequest,
    grpcStreaming,
    grpcStreamReceivedMessages,
    grpcStreamSentMessages,
  } = useStore();
  const [sending, setSending] = useState(false);
  const [diffLeft, setDiffLeft] = useState<string | null>(null);
  const [diffRight, setDiffRight] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const clear = () =>
    set({ grpcStreamSentMessages: [], grpcStreamReceivedMessages: [] });

  const send = async () => {
    const body = grpcRequest.body ?? "{}";
    setSending(true);
    try {
      const res = await grpcStreamSend(streamId, body);
      if (res.error) {
        set({ grpcStatus: `Send error: ${res.error}` });
      } else {
        set({ grpcStreamSentMessages: [...grpcStreamSentMessages, body] });
      }
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "SELECT") return;
        e.preventDefault();
        clear();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
      <div
        className="border-t border-[var(--border)] flex flex-col"
        style={{ maxHeight: 300 }}
      >
        <GrpcStreamTranscript
          grpcStreaming={grpcStreaming}
          sentMessages={grpcStreamSentMessages}
          receivedMessages={grpcStreamReceivedMessages}
          diffLeft={diffLeft}
          onClear={clear}
          onResetDiff={resetDiff}
          onSelectForDiff={selectForDiff}
        />
        <GrpcStreamMessageEditor
          body={grpcRequest.body ?? "{}"}
          sending={sending}
          streamId={streamId}
          onBodyChange={(body) => setGrpcRequest({ body })}
          onSend={send}
        />
      </div>
    </>
  );
}
