import { AlertTriangle } from "lucide-react";
import { useStore } from "../../../../store";
import { SensitiveKeyValueEditor } from "../SensitiveKeyValueEditor";

export function HeadersTab() {
  const { websocketRequest, setWebsocketRequest } = useStore();
  const hasSensitiveHeaders = websocketRequest.headers.some((h) =>
    /^(authorization|cookie|set-cookie)$/i.test(h.key),
  );

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {hasSensitiveHeaders && (
        <div className="flex items-start gap-2 px-3 py-2 bg-[var(--warn-bg)] border-b border-[var(--border)] text-2xs text-[var(--warn)] shrink-0">
          <AlertTriangle size={11} className="mt-0.5 shrink-0" />
          <span>
            Sensitive headers (Authorization, Cookie) are sent as plaintext
            handshake headers. Use the Auth tab for credentials instead.
          </span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2">
        <SensitiveKeyValueEditor
          rows={websocketRequest.headers}
          onChange={(rows) => setWebsocketRequest({ headers: rows })}
        />
      </div>
    </div>
  );
}
