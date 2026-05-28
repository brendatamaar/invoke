import { ArrowDown } from "lucide-react";
import type { GQLSubMessage, GQLSubState } from "../hooks/useGraphQLSubscription";

export function GQLSubscriptionLog({
  state,
  messages,
  onClear,
}: {
  state: GQLSubState;
  messages: GQLSubMessage[];
  onClear: () => void;
}) {
  const stateColors: Record<GQLSubState, string> = {
    idle: "bg-zinc-400",
    connecting: "bg-yellow-400 animate-pulse",
    subscribed: "bg-[var(--ok)] animate-pulse",
    complete: "bg-zinc-400",
    error: "bg-[var(--danger)]",
  };

  return (
    <div
      className="border-t border-[var(--border)] flex flex-col shrink-0"
      style={{ maxHeight: 200 }}
    >
      <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--border)] bg-[var(--surface-2)] shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${stateColors[state]}`} />
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider flex-1">
          Subscription
          {state === "subscribed" && (
            <span className="ml-1 font-normal normal-case">
              {"\u2014"} {messages.filter((m) => m.kind === "data").length} messages
            </span>
          )}
        </span>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-2xs text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-2xs text-[var(--text-3)] text-center py-4">
            {state === "connecting" ? "Connecting\u2026" : "Waiting for messages\u2026"}
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 px-3 py-1.5 border-b border-[var(--border)] last:border-0 ${
              msg.kind === "data" ? "" : "bg-[var(--surface-2)]"
            }`}
          >
            <ArrowDown
              size={11}
              className={`mt-0.5 shrink-0 ${
                msg.kind === "error"
                  ? "text-[var(--danger)]"
                  : msg.kind === "data"
                    ? "text-[var(--ok)]"
                    : msg.kind === "complete"
                      ? "text-[var(--warn)]"
                      : "text-[var(--text-3)]"
              }`}
            />
            <pre className="text-2xs font-mono text-[var(--text-1)] break-all whitespace-pre-wrap flex-1 min-w-0">
              {msg.payload}
            </pre>
            <span className="text-2xs text-[var(--text-3)] shrink-0 mt-0.5">
              {new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
