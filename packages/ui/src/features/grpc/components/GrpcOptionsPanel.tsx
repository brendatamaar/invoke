import type { ChangeEvent } from "react";
import { Select } from "../../../components/shared/Select";
import { useStore } from "../../../store";
import { formatGrpcTimeout } from "../utils/format";

export function GrpcOptionsPanel() {
  const { grpcRequest, setGrpcRequest, set } = useStore();
  const grpcTimeout = formatGrpcTimeout(grpcRequest.timeoutMs ?? 30000);

  const handleProtosetFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ab = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(ab);
      let b64 = "";
      for (let i = 0; i < bytes.length; i++) {
        b64 += String.fromCharCode(bytes[i]);
      }
      setGrpcRequest({ protosetBase64: btoa(b64) });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  return (
    <div className="p-3 flex flex-col gap-3 overflow-auto">
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-2)] w-36 shrink-0">Timeout (ms)</label>
        <input
          type="number"
          min={0}
          step={1000}
          className="input text-xs py-1 w-28"
          value={grpcRequest.timeoutMs ?? 30000}
          onChange={(e) => setGrpcRequest({ timeoutMs: Math.max(0, Number(e.target.value)) })}
        />
        <span
          className="text-2xs text-[var(--text-3)] font-mono"
          title={`grpc-timeout: ${grpcTimeout}`}
          aria-label={`grpc-timeout: ${grpcTimeout}`}
        >
          {grpcTimeout}
        </span>
      </div>
      <button
        type="button"
        onClick={() => set({ showSettings: true, settingsTab: "network" })}
        className="text-left text-2xs text-[var(--text-3)] hover:text-[var(--text-1)]"
      >
        TLS and certificate policy is in Settings &gt; Network.
      </button>
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-2)] w-36 shrink-0">Compression</label>
        <Select
          value={grpcRequest.compression ?? "none"}
          onChange={(e) => setGrpcRequest({ compression: e.target.value as "none" | "gzip" })}
        >
          <option value="none">None</option>
          <option value="gzip">gzip</option>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-2)] w-36 shrink-0">Max recv msg (MB)</label>
        <input
          type="number"
          min={1}
          max={256}
          step={1}
          className="input text-xs py-1 w-28"
          value={Math.round((grpcRequest.maxRecvMsgSize ?? 16 * 1024 * 1024) / (1024 * 1024))}
          onChange={(e) =>
            setGrpcRequest({
              maxRecvMsgSize: Math.max(1, Number(e.target.value)) * 1024 * 1024,
            })
          }
        />
        {(grpcRequest.maxRecvMsgSize ?? 0) >= 256 * 1024 * 1024 && (
          <span className="text-2xs text-[var(--warn)]">
            {"\u26a0"} Large messages may exhaust memory
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--text-2)] w-36 shrink-0">Max send msg (MB)</label>
        <input
          type="number"
          min={1}
          max={256}
          step={1}
          className="input text-xs py-1 w-28"
          value={Math.round((grpcRequest.maxSendMsgSize ?? 16 * 1024 * 1024) / (1024 * 1024))}
          onChange={(e) =>
            setGrpcRequest({
              maxSendMsgSize: Math.max(1, Number(e.target.value)) * 1024 * 1024,
            })
          }
        />
      </div>
      <p className="text-2xs font-semibold uppercase tracking-wide text-[var(--text-3)] pt-1">
        Protoset (FileDescriptorSet)
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-2xs text-[var(--text-3)]">
          Upload a pre-compiled <code>.pb</code> file (<code>buf build -o desc.pb</code>) to use
          without server reflection.
        </p>
        <div className="flex items-center gap-2">
          <label className="btn text-2xs cursor-pointer">
            {grpcRequest.protosetBase64 ? "Replace .pb" : "Upload .pb"}
            <input type="file" accept=".pb,.bin" className="hidden" onChange={handleProtosetFile} />
          </label>
          {grpcRequest.protosetBase64 && (
            <button
              className="text-2xs text-[var(--danger)] hover:underline"
              onClick={() => setGrpcRequest({ protosetBase64: undefined })}
            >
              Remove
            </button>
          )}
          {grpcRequest.protosetBase64 && (
            <span className="text-2xs text-[var(--ok)]">
              {"\u2713"} Protoset loaded (
              {Math.round((grpcRequest.protosetBase64.length * 0.75) / 1024)}KB)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
