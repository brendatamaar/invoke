import type { RequestProtocol } from "@invoke/core";
import { PROTOCOL_LABELS, PROTOCOLS } from "../../constants";

export function ProtocolPills({
  editingProtocol,
  onChange,
}: {
  editingProtocol: RequestProtocol;
  onChange: (protocol: RequestProtocol) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROTOCOLS.map((protocol) => {
        const active = protocol === editingProtocol;
        return (
          <button
            type="button"
            key={protocol}
            onClick={() => onChange(protocol)}
            className={`rounded border px-3 py-1.5 text-xs transition-colors ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-faint)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-2)]"
            }`}
          >
            {PROTOCOL_LABELS[protocol]}
          </button>
        );
      })}
    </div>
  );
}
