import { useEffect, useRef } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { GrpcStreamMessage } from "@invoke/core";
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
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [sentMessages.length, receivedMessages.length]);

  const receivedBodies = receivedMessages.filter((m) => !m.done && m.bodyJson);

  return (
    <>
      <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)] flex items-center gap-2">
        <span>Stream transcript</span>
        {grpcStreaming && (
          <span className="text-[var(--accent)] animate-pulse">
            {"\u25cf"} live
          </span>
        )}
        <GrpcDeadlineCountdown />
        <span className="ml-auto text-2xs">
          {sentMessages.length} sent {"\u00b7"}{" "}
          {receivedMessages.filter((m) => !m.done).length} received
        </span>
        {receivedBodies.length >= 2 && (
          <button
            className="flex items-center gap-1 text-2xs text-[var(--accent)] hover:underline shrink-0"
            title="Select two received messages to diff (click first, then second)"
            onClick={onResetDiff}
          >
            <ArrowLeftRight size={10} />
            {diffLeft ? "pick 2nd" : "Diff msgs"}
          </button>
        )}
        <button
          className="text-2xs text-[var(--text-3)] hover:text-[var(--text-1)] shrink-0"
          title="Clear log (Ctrl+L)"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
      <div ref={logRef} className="overflow-y-auto flex-1">
        {sentMessages.length === 0 && receivedMessages.length === 0 && (
          <p className="p-3 text-2xs text-[var(--text-3)]">
            Compose a message below and press Enter or click Send.
          </p>
        )}
        {sentMessages.map((body, i) => (
          <div
            key={`s${i}`}
            className="px-3 py-1.5 border-b border-[var(--border)] last:border-0 flex items-start gap-2"
          >
            <span className="text-2xs font-semibold text-[var(--accent)] shrink-0">
              {"\u2192"}
            </span>
            <pre className="text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all flex-1">
              {body}
            </pre>
          </div>
        ))}
        {receivedMessages.map((msg, i) => (
          <div
            key={`r${i}`}
            className={`px-3 py-1.5 border-b border-[var(--border)] last:border-0 flex items-start gap-2 ${msg.done ? "bg-[var(--surface-2)]" : ""}`}
          >
            {msg.done ? (
              <span
                className={`text-2xs font-semibold ${msg.error ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
              >
                {msg.error
                  ? `Error: ${msg.statusMessage || msg.error}`
                  : `Done${msg.durationMs != null ? ` \u2014 ${msg.durationMs.toFixed(0)}ms` : ""}`}
              </span>
            ) : (
              <>
                <span className="text-2xs font-semibold text-[var(--ok)] shrink-0">
                  {"\u2190"}
                </span>
                <pre
                  className={`text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all flex-1 cursor-pointer ${diffLeft === msg.bodyJson ? "bg-yellow-100 dark:bg-yellow-900/20 rounded" : ""}`}
                  title={
                    diffLeft
                      ? "Click to select as right side of diff"
                      : "Click to select as left side of diff"
                  }
                  onClick={() => msg.bodyJson && onSelectForDiff(msg.bodyJson)}
                >
                  {msg.bodyJson}
                </pre>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
