import { Copy, Settings, Trash2 } from "lucide-react";
import type { WebhookEndpoint } from "../../../../types";

export function WebhookEndpointRow({
  endpoint,
  copied,
  onCopy,
  onConfigure,
  onDelete,
}: {
  endpoint: WebhookEndpoint;
  copied: boolean;
  onCopy: () => void;
  onConfigure: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 px-3 py-2 border-t border-[var(--border)] hover:bg-[var(--surface-2)]">
      <span className="flex-1 text-xs text-[var(--text-1)] truncate">{endpoint.label}</span>
      {endpoint.validation.type !== "none" && (
        <span className="text-2xs bg-[var(--accent-subtle)] text-[var(--accent)] rounded px-1 shrink-0">
          {endpoint.validation.type}
        </span>
      )}
      <button
        onClick={onCopy}
        title="Copy URL"
        className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 shrink-0"
      >
        {copied ? <span className="text-2xs text-[var(--ok)]">Copied</span> : <Copy size={11} />}
      </button>
      <button
        onClick={onConfigure}
        title="Configure"
        className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 shrink-0"
      >
        <Settings size={11} />
      </button>
      <button
        onClick={onDelete}
        title="Delete Webhook"
        className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5 shrink-0"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
