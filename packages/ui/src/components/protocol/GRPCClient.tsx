import { useStore } from "../../store";
import { CodeEditor } from "../editors/CodeEditor";
import { KeyValueEditor } from "../shared/KeyValueEditor";
import { Select } from "../shared/Select";
import type { KeyValue } from "@invoke/core";

function streamBadge(method: { serverStreaming?: boolean; clientStreaming?: boolean }) {
  if (method.serverStreaming && method.clientStreaming) return <span className="text-2xs px-1 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">bidi</span>;
  if (method.serverStreaming) return <span className="text-2xs px-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">server-stream</span>;
  if (method.clientStreaming) return <span className="text-2xs px-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">client-stream</span>;
  return null;
}

export function GRPCClient() {
  const { grpcRequest, setGrpcRequest, grpcMethods, grpcStatus, grpcStreaming, grpcStreamMessages } = useStore();

  const selectedMethod = grpcMethods.find(
    (m) => m.service === grpcRequest.service && m.method === grpcRequest.method,
  );
  const isServerStreaming = selectedMethod?.serverStreaming ?? false;

  return (
    <div className="flex flex-col h-full gap-0">
      {grpcStatus && (
        <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)] bg-[var(--surface-2)]">
          {grpcStatus}
        </div>
      )}

      {/* Method selector */}
      {grpcMethods.length > 0 && (
        <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center gap-2">
          <Select
            value={`${grpcRequest.service ?? ""}/${grpcRequest.method ?? ""}`}
            onChange={(e) => {
              const [service, method] = e.target.value.split("/");
              setGrpcRequest({ service, method });
            }}
            className="flex-1"
          >
            <option value="/">Select method…</option>
            {grpcMethods.map((m) => (
              <option
                key={`${m.service}/${m.method}`}
                value={`${m.service}/${m.method}`}
              >
                {m.service} / {m.method}
                {m.serverStreaming ? " ▸" : ""}
              </option>
            ))}
          </Select>
          {selectedMethod && streamBadge(selectedMethod)}
        </div>
      )}

      {/* Message body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-[var(--border)] px-3 py-1 text-2xs text-[var(--text-3)]">
          Message (JSON)
        </div>
        <div className="flex-1 overflow-auto">
          <CodeEditor
            value={grpcRequest.body ?? "{}"}
            onChange={(v) => setGrpcRequest({ body: v })}
            lang="json"
          />
        </div>
      </div>

      {/* Server-stream messages */}
      {isServerStreaming && (
        <div className="border-t border-[var(--border)] flex flex-col" style={{ maxHeight: 200 }}>
          <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)] flex items-center gap-2">
            <span>Stream messages</span>
            {grpcStreaming && <span className="text-[var(--accent)] animate-pulse">● live</span>}
            {grpcStreamMessages.length > 0 && (
              <span className="ml-auto">{grpcStreamMessages.filter((m) => !m.done).length} received</span>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {grpcStreamMessages.length === 0 && !grpcStreaming && (
              <p className="p-3 text-2xs text-[var(--text-3)]">No messages yet. Click Invoke to start streaming.</p>
            )}
            {grpcStreamMessages.map((msg, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 border-b border-[var(--border)] last:border-0 ${msg.done ? "bg-[var(--surface-2)]" : ""}`}
              >
                {msg.done ? (
                  <div className="flex items-center gap-2">
                    <span className={`text-2xs font-semibold ${msg.error ? "text-red-500" : "text-emerald-600"}`}>
                      {msg.error ? `Error: ${msg.statusMessage || msg.error}` : `Completed — ${msg.durationMs?.toFixed(0)}ms`}
                    </span>
                    {msg.trailers && msg.trailers.length > 0 && (
                      <span className="text-2xs text-[var(--text-3)]">
                        {msg.trailers.map((t) => `${t.key}: ${t.value}`).join(", ")}
                      </span>
                    )}
                  </div>
                ) : (
                  <pre className="text-2xs font-mono text-[var(--text-1)] whitespace-pre-wrap break-all">
                    {msg.bodyJson}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="border-t border-[var(--border)]">
        <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)]">
          Metadata
        </div>
        <KeyValueEditor
          rows={(grpcRequest.metadata as KeyValue[] | undefined) ?? []}
          onChange={(rows) => setGrpcRequest({ metadata: rows as KeyValue[] })}
          keyPlaceholder="key"
          valuePlaceholder="value"
        />
      </div>
    </div>
  );
}
