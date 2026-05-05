import { useStore } from "../../store";
import { CodeEditor } from "../editors/CodeEditor";
import { KeyValueEditor } from "../shared/KeyValueEditor";
import type { KeyValue } from "@invoke/core";

export function GRPCClient() {
  const { grpcRequest, setGrpcRequest, grpcMethods, grpcStatus } = useStore();

  return (
    <div className="flex flex-col h-full gap-0">
      {grpcStatus && (
        <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)] bg-[var(--surface-2)]">{grpcStatus}</div>
      )}

      {/* Method selector */}
      {grpcMethods.length > 0 && (
        <div className="px-3 py-1.5 border-b border-[var(--border)]">
          <select
            value={`${grpcRequest.service ?? ""}/${grpcRequest.method ?? ""}`}
            onChange={(e) => {
              const [service, method] = e.target.value.split("/");
              setGrpcRequest({ service, method });
            }}
            className="input text-xs py-1"
          >
            <option value="/">Select method…</option>
            {grpcMethods.map((m) => (
              <option key={`${m.service}/${m.method}`} value={`${m.service}/${m.method}`}>
                {m.service} / {m.method}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Message body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-[var(--border)] px-3 py-1 text-2xs text-[var(--text-3)]">Message (JSON)</div>
        <div className="flex-1 overflow-auto">
          <CodeEditor value={grpcRequest.body ?? "{}"} onChange={(v) => setGrpcRequest({ body: v })} lang="json" />
        </div>
      </div>

      {/* Metadata */}
      <div className="border-t border-[var(--border)]">
        <div className="px-3 py-1 text-2xs text-[var(--text-3)] border-b border-[var(--border)]">Metadata</div>
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
