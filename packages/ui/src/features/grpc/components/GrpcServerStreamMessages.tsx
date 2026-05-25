import { ArrowLeftRight } from "lucide-react";
import type { GrpcStreamMessage } from "@invoke/core";
import { GrpcDeadlineCountdown } from "./GrpcDeadlineCountdown";

export function GrpcServerStreamMessages({
  grpcStreaming,
  messages,
  diffLeft,
  onResetDiff,
  onSelectForDiff,
}: {
  grpcStreaming: boolean;
  messages: GrpcStreamMessage[];
  diffLeft: string | null;
  onResetDiff: () => void;
  onSelectForDiff: (body: string) => void;
}) {
  const receivedStreamBodies = messages.filter((m) => !m.done && m.bodyJson);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)] flex items-center gap-2 shrink-0">
        <span>Stream messages</span>
        {grpcStreaming && (
          <span className="text-[var(--accent)] animate-pulse">
            {"\u25cf"} live
          </span>
        )}
        <GrpcDeadlineCountdown />
        {messages.length > 0 && (
          <span className="ml-auto">
            {messages.filter((m) => !m.done).length} received
          </span>
        )}
        {receivedStreamBodies.length >= 2 && (
          <button
            className="flex items-center gap-1 text-2xs text-[var(--accent)] hover:underline shrink-0"
            title="Click two messages to diff them"
            onClick={onResetDiff}
          >
            <ArrowLeftRight size={10} />
            {diffLeft ? "pick 2nd" : "Diff msgs"}
          </button>
        )}
      </div>
      <div className="overflow-y-auto flex-1 min-h-0">
        {messages.length === 0 && !grpcStreaming && (
          <p className="p-3 text-2xs text-[var(--text-3)]">
            No messages yet. Click Invoke to start streaming.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`px-3 py-1.5 border-b border-[var(--border)] last:border-0 ${msg.done ? "bg-[var(--surface-2)]" : ""}`}
          >
            {msg.done ? (
              <div className="flex items-center gap-2">
                <span
                  className={`text-2xs font-semibold ${msg.error ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
                >
                  {msg.error
                    ? `Error: ${msg.statusMessage || msg.error}`
                    : `Completed \u2014 ${msg.durationMs?.toFixed(0)}ms`}
                </span>
                {msg.trailers && msg.trailers.length > 0 && (
                  <span className="text-2xs text-[var(--text-3)]">
                    {msg.trailers.map((t) => `${t.key}: ${t.value}`).join(", ")}
                  </span>
                )}
              </div>
            ) : (
              <pre
                className={`text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all cursor-pointer ${diffLeft === msg.bodyJson ? "bg-yellow-100 dark:bg-yellow-900/20 rounded" : ""}`}
                title={
                  diffLeft
                    ? "Click to select as right side of diff"
                    : "Click to select as left side of diff"
                }
                onClick={() => msg.bodyJson && onSelectForDiff(msg.bodyJson)}
              >
                {msg.bodyJson}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
