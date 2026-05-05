import { useStore } from "../../store";
import { grpcReflect, grpcExecute } from "../../lib/api";
import { CodeEditor } from "../editors/CodeEditor";
import { KeyValueEditor } from "../shared/KeyValueEditor";
import type { KeyValue } from "@invoke/core";
import { RefreshCw } from "lucide-react";

export function GRPCClient() {
  const { grpcRequest, setGrpcRequest, grpcMethods, grpcStatus, set, addToast } = useStore();

  const reflect = async () => {
    set({ grpcStatus: "Reflecting…" });
    try {
      const { methods, error } = await grpcReflect(grpcRequest);
      if (error) throw new Error(error);
      set({ grpcMethods: methods, grpcStatus: `${methods.length} methods found` });
    } catch (e) { set({ grpcStatus: "Error" }); addToast("error", String(e)); }
  };

  const execute = async () => {
    set({ grpcStatus: "Executing…" });
    try {
      const res = await grpcExecute(grpcRequest);
      set({ grpcStatus: "Done" });
      useStore.getState().set({ response: { status: 200, statusText: "OK", headers: {}, body: res.bodyJson ?? "", timing: { total: res.durationMs ?? 0 }, size: 0 } as Parameters<typeof set>[0]["response"] });
    } catch (e) { set({ grpcStatus: "Error" }); addToast("error", String(e)); }
  };

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Connection */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <input
          value={grpcRequest.address}
          onChange={(e) => setGrpcRequest({ address: e.target.value })}
          placeholder="localhost:50051"
          className="input text-xs py-1 font-mono flex-1"
        />
        <label className="flex items-center gap-1 text-xs text-[var(--text-2)]">
          <input type="checkbox" checked={grpcRequest.tls ?? false} onChange={(e) => setGrpcRequest({ tls: e.target.checked })} className="accent-[var(--accent)]" />
          TLS
        </label>
        <button onClick={reflect} className="btn text-xs gap-1"><RefreshCw size={12} /> Reflect</button>
        <button onClick={execute} className="btn btn-primary text-xs">Invoke</button>
      </div>

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
