import { Binary, FileText, Plus } from "lucide-react";
import type { WebSocketRequestConfig } from "@invoke/core";

export function WebSocketComposer({
  preset,
  websocketRequest,
  websocketState,
  message,
  binaryMode,
  gqlSubscribed,
  onRequestChange,
  onMessageChange,
  onBinaryModeChange,
  onSend,
  onSubscribe,
  onUnsubscribe,
  onOpenSaved,
}: {
  preset: string;
  websocketRequest: WebSocketRequestConfig;
  websocketState: string;
  message: string;
  binaryMode: boolean;
  gqlSubscribed: boolean;
  onRequestChange: (patch: Partial<WebSocketRequestConfig>) => void;
  onMessageChange: (message: string) => void;
  onBinaryModeChange: (enabled: boolean) => void;
  onSend: () => void;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  onOpenSaved: () => void;
}) {
  return (
    <div className="p-2 flex flex-col gap-2 border-b border-[var(--border)]">
      {preset === "graphql-transport-ws" ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-2xs text-[var(--text-3)] font-medium uppercase tracking-wide">
            graphql-transport-ws
          </div>
          <textarea
            value={websocketRequest.presetQuery ?? ""}
            onChange={(e) => onRequestChange({ presetQuery: e.target.value })}
            placeholder="subscription { ... }"
            aria-label="GraphQL subscription query"
            rows={3}
            className="input text-xs font-mono resize-none py-1.5"
          />
          <textarea
            value={websocketRequest.presetVariables ?? "{}"}
            onChange={(e) => onRequestChange({ presetVariables: e.target.value })}
            placeholder="{}"
            aria-label="GraphQL subscription variables"
            rows={2}
            className="input text-xs font-mono resize-none py-1.5"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSubscribe}
              disabled={websocketState !== "connected" || gqlSubscribed}
              className="btn btn-primary text-xs px-3"
            >
              Subscribe
            </button>
            <button
              type="button"
              onClick={onUnsubscribe}
              disabled={websocketState !== "connected" || !gqlSubscribed}
              className="btn btn-danger text-xs px-3"
            >
              Unsubscribe
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onBinaryModeChange(false)}
              className={`flex items-center gap-1 text-2xs px-2 py-0.5 rounded ${!binaryMode ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
            >
              <FileText size={10} /> Text
            </button>
            <button
              type="button"
              onClick={() => onBinaryModeChange(true)}
              className={`flex items-center gap-1 text-2xs px-2 py-0.5 rounded ${binaryMode ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
            >
              <Binary size={10} /> Binary (base64)
            </button>
          </div>
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder={binaryMode ? "Base64-encoded bytes…" : "Message…"}
              disabled={websocketState !== "connected"}
              rows={6}
              aria-label="Message to send"
              className="input text-xs font-mono flex-1 resize-none py-1.5"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSend}
              disabled={websocketState !== "connected"}
              className="btn btn-primary text-xs px-4"
            >
              Send
            </button>
            <button type="button" onClick={onOpenSaved} className="btn text-xs gap-1">
              <Plus size={11} /> Saved Messages
            </button>
          </div>
        </>
      )}
    </div>
  );
}
