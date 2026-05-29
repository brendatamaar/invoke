import { useState } from "react";
import { Plus } from "lucide-react";
import type { WebhookEndpoint, WebhookValidationConfig } from "../../../types";
import { useStore } from "../../../store";
import { deleteWebhookEndpoint } from "../../webhook/api";
import { DEFAULT_VALIDATION } from "./webhook/constants";
import { WebhookEndpointRow } from "./webhook/WebhookEndpointRow";
import { WebhookModal } from "./webhook/WebhookModal";

export function WebhookSection() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [activeEndpoint, setActiveEndpoint] = useState<WebhookEndpoint | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const addToast = useStore((s) => s.addToast);
  const serverBase = `${window.location.protocol}//${window.location.hostname}:4000`;

  const addEndpoint = () => {
    const endpoint: WebhookEndpoint = {
      id: crypto.randomUUID(),
      label: `Webhook ${endpoints.length + 1}`,
      validation: { ...DEFAULT_VALIDATION },
    };
    setEndpoints((previous) => [...previous, endpoint]);
  };

  const removeEndpoint = async (id: string) => {
    try {
      await deleteWebhookEndpoint(id);
    } catch (error) {
      addToast(
        "error",
        `Failed to delete webhook: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }
    setEndpoints((previous) => previous.filter((endpoint) => endpoint.id !== id));
    if (activeEndpoint?.id === id) setActiveEndpoint(null);
  };

  const updateEndpoint = (id: string, label: string, validation: WebhookValidationConfig) =>
    setEndpoints((previous) =>
      previous.map((endpoint) =>
        endpoint.id === id ? { ...endpoint, label, validation } : endpoint,
      ),
    );

  const copyUrl = (id: string) => {
    navigator.clipboard.writeText(`${serverBase}/webhook/${id}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="border-b border-[var(--border)] shrink-0">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Webhooks {endpoints.length > 0 && `- ${endpoints.length}`}
        </span>
        <button
          type="button"
          onClick={addEndpoint}
          className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
          title="New webhook endpoint"
        >
          <Plus size={13} />
        </button>
      </div>
      {endpoints.length === 0 && (
        <p className="p-4 text-xs text-[var(--text-3)] text-center">No endpoints yet</p>
      )}
      {endpoints.map((endpoint) => (
        <WebhookEndpointRow
          key={endpoint.id}
          endpoint={endpoint}
          copied={copied === endpoint.id}
          onCopy={() => copyUrl(endpoint.id)}
          onConfigure={() => setActiveEndpoint(endpoint)}
          onDelete={() => removeEndpoint(endpoint.id)}
        />
      ))}
      {activeEndpoint && (
        <WebhookModal
          endpoint={activeEndpoint}
          onClose={() => setActiveEndpoint(null)}
          onUpdate={updateEndpoint}
        />
      )}
    </div>
  );
}
