import { ArrowLeftRight, CheckCircle2, Circle, Copy, Trash2, X } from "lucide-react";
import type { GrpcStreamMessage } from "@invoke/core";
import { useStore } from "../../../store";
import { useAutoScroll, CollapsibleBody, ScrollToBottomBtn } from "./GrpcStreamShared";
import { GrpcDeadlineCountdown } from "./GrpcDeadlineCountdown";

export function GrpcStreamTranscript({
  grpcStreaming,
  sentMessages,
  receivedMessages,
  diffLeft,
  onClear,
  onResetDiff,
  onSelectForDiff,
}: {
  grpcStreaming: boolean;
  sentMessages: string[];
  receivedMessages: GrpcStreamMessage[];
  diffLeft: string | null;
  onClear: () => void;
  onResetDiff: () => void;
  onSelectForDiff: (body: string) => void;
}) {
  const { addToast } = useStore();
  const triggerCount = sentMessages.length + receivedMessages.length;
  const { scrollRef, showScrollBtn, handleScroll, scrollToBottom } = useAutoScroll(
    triggerCount,
    grpcStreaming,
  );

  const sentCount = sentMessages.length;
  const receivedCount = receivedMessages.filter((m) => !m.done).length;
  const hasDiffSelection = diffLeft !== null;
  const firstArrival = receivedMessages.find((m) => m.receivedAt)?.receivedAt;

  const copyText = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .catch((e: unknown) =>
        addToast("error", `Copy failed: ${e instanceof Error ? e.message : String(e)}`),
      );
  };

  return (
    <>
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2 shrink-0">
        <span className="text-2xs text-[var(--text-3)]">Stream transcript</span>
        {grpcStreaming && (
          <span className="flex items-center gap-1 text-[var(--accent)] text-2xs">
            <span className="inline-block size-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            live
          </span>
        )}
        <GrpcDeadlineCountdown />
        {(sentCount > 0 || receivedCount > 0) && (
          <span className="ml-auto text-2xs text-[var(--text-3)]">
            {sentCount} sent · {receivedCount} received
          </span>
        )}
        {(sentMessages.length > 0 || receivedMessages.length > 0) && (
          <button
            type="button"
            className="p-0.5 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
            title="Clear transcript (Ctrl+L)"
            onClick={onClear}
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto" onScroll={handleScroll}>
          {sentMessages.length === 0 && receivedMessages.length === 0 && !grpcStreaming && (
            <p className="p-3 text-2xs text-[var(--text-3)]">No stream messages yet.</p>
          )}

          {sentMessages.map((body, i) => (
            <div
              key={body}
              className="group flex items-start gap-2 px-3 py-2 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
            >
              <span className="mt-0.5 text-2xs font-bold text-[var(--accent)] shrink-0">→</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-2xs font-mono font-medium text-[var(--text-3)] shrink-0">
                    #{i}
                  </span>
                  <button
                    type="button"
                    className="ml-auto p-0.5 text-[var(--text-3)] hover:text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy message"
                    onClick={() => copyText(body)}
                  >
                    <Copy size={10} />
                  </button>
                </div>
                <CollapsibleBody text={body} />
              </div>
            </div>
          ))}

          {receivedMessages.map((msg, i) => {
            if (!msg.done && !msg.bodyJson) return null;

            const relativeMs =
              firstArrival != null && msg.receivedAt != null && msg.receivedAt > firstArrival
                ? msg.receivedAt - firstArrival
                : null;

            if (msg.done) {
              return (
                <div
                  key={`done-${msg.statusCode ?? ""}-${msg.receivedAt ?? msg.durationMs ?? ""}`}
                  className="px-3 py-2 border-b border-[var(--border)] last:border-0 bg-[var(--surface-2)]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-2xs font-semibold ${msg.error ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
                    >
                      {msg.error
                        ? `Error: ${msg.statusMessage || msg.error}`
                        : `Completed  ${msg.durationMs?.toFixed(0)}ms`}
                    </span>
                    {msg.trailers && msg.trailers.length > 0 && (
                      <span className="text-2xs text-[var(--text-3)]">
                        {msg.trailers.map((t) => `${t.key}: ${t.value}`).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            const isSelected = diffLeft === msg.bodyJson;
            const showCheckbox = isSelected || hasDiffSelection;

            return (
              <div
                key={msg.bodyJson ?? `recv-${msg.receivedAt}`}
                className={`group flex items-start gap-2 px-3 py-2 border-b border-[var(--border)] last:border-0 transition-colors ${isSelected ? "bg-[var(--accent-subtle)]" : "hover:bg-[var(--surface-2)]"}`}
              >
                <button
                  type="button"
                  onClick={() => msg.bodyJson && onSelectForDiff(msg.bodyJson)}
                  title={
                    isSelected
                      ? "Deselect"
                      : hasDiffSelection
                        ? "Select as 2nd message"
                        : "Select for diff"
                  }
                  className={`mt-0.5 shrink-0 transition-opacity ${showCheckbox ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${isSelected ? "text-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--accent)]"}`}
                >
                  {isSelected ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                </button>

                <span className="mt-0.5 text-2xs font-bold text-[var(--ok)] shrink-0">←</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xs font-mono font-medium text-[var(--text-3)] shrink-0">
                      #{i}
                    </span>
                    {relativeMs != null && (
                      <span className="text-2xs text-[var(--text-3)]">+{relativeMs}ms</span>
                    )}
                    <button
                      type="button"
                      className="ml-auto p-0.5 text-[var(--text-3)] hover:text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy message"
                      onClick={() => msg.bodyJson && copyText(msg.bodyJson)}
                    >
                      <Copy size={10} />
                    </button>
                  </div>
                  <CollapsibleBody text={msg.bodyJson ?? ""} />
                </div>
              </div>
            );
          })}
        </div>

        {hasDiffSelection && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border)] px-3 py-1.5 flex items-center gap-2 bg-[var(--surface-2)] shrink-0">
            <ArrowLeftRight size={11} className="text-[var(--accent)] shrink-0" />
            <span className="text-2xs text-[var(--text-2)] flex-1">Select one more to diff</span>
            <button
              type="button"
              onClick={onResetDiff}
              className="p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)]"
            >
              <X size={11} />
            </button>
          </div>
        )}

        <ScrollToBottomBtn
          show={showScrollBtn}
          onClick={scrollToBottom}
          offset={hasDiffSelection}
        />
      </div>
    </>
  );
}
