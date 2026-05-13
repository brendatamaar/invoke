import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Plus, Trash2 } from "lucide-react";
import { MethodBadge } from "../../../components/shared/MethodBadge";
import { useStore } from "../../../store";
import type {
  HmacAlgorithm,
  WebhookEndpoint,
  WebhookEntry,
  WebhookValidationConfig,
} from "../../../types";
import {
  clearWebhookLogs,
  deleteWebhookEndpoint,
  loadWebhookLogs,
  setWebhookConfig,
} from "../../webhook/api";
import { formatTime } from "./mockRouteUtils";

const DEFAULT_VALIDATION: WebhookValidationConfig = { type: "none" };

function ValidationConfigForm({
  config,
  onChange,
  onSave,
  saving,
}: {
  config: WebhookValidationConfig;
  onChange: (c: WebhookValidationConfig) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const set = (patch: Partial<WebhookValidationConfig>) =>
    onChange({ ...config, ...patch });

  return (
    <div className="px-3 py-2 flex flex-col gap-2 border-t border-[var(--border)]">
      <div className="flex items-center justify-between">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Validation
        </span>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn text-2xs py-0.5 px-2"
        >
          {saving ? "Saving..." : "Apply"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-2xs text-[var(--text-3)] shrink-0">Type</label>
        <select
          value={config.type}
          onChange={(e) =>
            set({ type: e.target.value as WebhookValidationConfig["type"] })
          }
          className="input text-xs py-0.5 flex-1"
        >
          <option value="none">None</option>
          <option value="hmac">HMAC Signature</option>
          <option value="header">Header Token</option>
        </select>
      </div>

      {config.type === "hmac" && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">
              Algorithm
            </label>
            <select
              value={config.algorithm ?? "sha256"}
              onChange={(e) =>
                set({ algorithm: e.target.value as HmacAlgorithm })
              }
              className="input text-xs py-0.5 flex-1"
            >
              <option value="sha256">SHA-256</option>
              <option value="sha1">SHA-1</option>
              <option value="sha512">SHA-512</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">
              Secret
            </label>
            <input
              type="password"
              value={config.secret ?? ""}
              onChange={(e) => set({ secret: e.target.value })}
              placeholder="your-webhook-secret"
              className="input text-xs py-0.5 flex-1 font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">
              Sig. header
            </label>
            <input
              value={config.signatureHeader ?? ""}
              onChange={(e) => set({ signatureHeader: e.target.value })}
              placeholder="X-Hub-Signature-256"
              className="input text-xs py-0.5 flex-1 font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">
              Prefix
            </label>
            <input
              value={config.signaturePrefix ?? ""}
              onChange={(e) => set({ signaturePrefix: e.target.value })}
              placeholder="sha256= (optional)"
              className="input text-xs py-0.5 flex-1 font-mono"
            />
          </div>
        </>
      )}

      {config.type === "header" && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">
              Header
            </label>
            <input
              value={config.headerName ?? ""}
              onChange={(e) => set({ headerName: e.target.value })}
              placeholder="X-Webhook-Token"
              className="input text-xs py-0.5 flex-1 font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">
              Expected
            </label>
            <input
              type="password"
              value={config.headerValue ?? ""}
              onChange={(e) => set({ headerValue: e.target.value })}
              placeholder="secret-token"
              className="input text-xs py-0.5 flex-1 font-mono"
            />
          </div>
        </>
      )}
    </div>
  );
}

export function WebhookSection() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [logs, setLogs] = useState<Record<string, WebhookEntry[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const { addToast } = useStore();

  const serverBase = `${window.location.protocol}//${window.location.hostname}:4000`;

  const addEndpoint = () => {
    const ep: WebhookEndpoint = {
      id: crypto.randomUUID(),
      label: `Webhook ${endpoints.length + 1}`,
      validation: { ...DEFAULT_VALIDATION },
    };
    setEndpoints((prev) => [...prev, ep]);
  };

  const removeEndpoint = async (id: string) => {
    try {
      await deleteWebhookEndpoint(id);
    } catch {
      // best-effort
    }
    setEndpoints((prev) => prev.filter((e) => e.id !== id));
    setLogs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (expandedId === id) setExpandedId(null);
  };

  const updateValidation = (id: string, validation: WebhookValidationConfig) =>
    setEndpoints((prev) =>
      prev.map((e) => (e.id === id ? { ...e, validation } : e)),
    );

  const applyConfig = async (ep: WebhookEndpoint) => {
    setSaving(ep.id);
    try {
      await setWebhookConfig(ep.id, ep.validation);
      addToast("success", "Validation config saved");
    } catch (e) {
      addToast("error", String(e));
    } finally {
      setSaving(null);
    }
  };

  const refresh = useCallback(
    async (id: string) => {
      try {
        const entries = await loadWebhookLogs(id);
        setLogs((prev) => ({ ...prev, [id]: entries }));
      } catch (e) {
        addToast("error", String(e));
      }
    },
    [addToast],
  );

  const clear = async (id: string) => {
    try {
      await clearWebhookLogs(id);
      setLogs((prev) => ({ ...prev, [id]: [] }));
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const copyUrl = (id: string) => {
    navigator.clipboard.writeText(`${serverBase}/webhook/${id}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  useEffect(() => {
    if (!expandedId) return;
    refresh(expandedId);
    const timer = setInterval(() => refresh(expandedId), 3000);
    return () => clearInterval(timer);
  }, [expandedId, refresh]);

  return (
    <div className="border-b border-[var(--border)] shrink-0">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Webhooks {endpoints.length > 0 && `- ${endpoints.length}`}
        </span>
        <button
          onClick={addEndpoint}
          className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
          title="New webhook endpoint"
        >
          <Plus size={13} />
        </button>
      </div>

      {endpoints.length === 0 && (
        <p className="p-4 text-xs text-[var(--text-3)] text-center">
          No endpoints yet
        </p>
      )}

      {endpoints.map((ep) => {
        const epLogs = logs[ep.id] ?? [];
        const isExpanded = expandedId === ep.id;
        const hasValidation = ep.validation.type !== "none";
        return (
          <div key={ep.id} className="border-t border-[var(--border)]">
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)]">
              <button
                onClick={() => setExpandedId(isExpanded ? null : ep.id)}
                className="text-[var(--text-3)]"
              >
                {isExpanded ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
              </button>
              <span className="flex-1 text-xs font-mono text-[var(--text-1)] truncate">
                /webhook/{ep.id.slice(0, 8)}...
              </span>
              {hasValidation && (
                <span className="text-2xs bg-[var(--accent-subtle)] text-[var(--accent)] rounded px-1 shrink-0">
                  {ep.validation.type}
                </span>
              )}
              <button
                onClick={() => copyUrl(ep.id)}
                title="Copy URL"
                className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
              >
                {copied === ep.id ? (
                  <span className="text-2xs text-[var(--ok)]">Copied</span>
                ) : (
                  <Copy size={11} />
                )}
              </button>
              <button
                onClick={() => removeEndpoint(ep.id)}
                className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5"
              >
                <Trash2 size={11} />
              </button>
            </div>

            {isExpanded && (
              <div className="border-t border-[var(--border)] bg-[var(--surface-2)]">
                <ValidationConfigForm
                  config={ep.validation}
                  onChange={(v) => updateValidation(ep.id, v)}
                  onSave={() => applyConfig(ep)}
                  saving={saving === ep.id}
                />

                <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--border)]">
                  <span className="text-2xs text-[var(--text-3)]">
                    {epLogs.length}{" "}
                    {epLogs.length === 1 ? "request" : "requests"} -
                    auto-refresh 3s
                  </span>
                  {epLogs.length > 0 && (
                    <button
                      onClick={() => clear(ep.id)}
                      className="text-2xs text-[var(--text-3)] hover:text-[var(--danger)]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="font-mono text-2xs">
                  {epLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-2 px-3 py-1 border-t border-[var(--border)]"
                    >
                      <span className="text-[var(--text-3)] shrink-0">
                        {formatTime(log.createdAt)}
                      </span>
                      <MethodBadge method={log.method} />
                      {hasValidation && (
                        <span
                          className={`shrink-0 font-semibold ${log.validationPassed ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
                          title={log.validationError ?? "OK"}
                        >
                          {log.validationPassed ? "OK" : "ERR"}
                        </span>
                      )}
                      <span className="flex-1 text-[var(--text-2)] truncate">
                        {log.body ? log.body.slice(0, 60) : "(empty)"}
                      </span>
                    </div>
                  ))}
                  {epLogs.length === 0 && (
                    <p className="px-3 py-2 text-[var(--text-3)]">
                      Waiting for requests...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
