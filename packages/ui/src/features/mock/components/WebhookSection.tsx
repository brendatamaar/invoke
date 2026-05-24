import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, ChevronDown, ChevronRight, Settings, X, RefreshCw } from "lucide-react";
import { Select } from "../../../components/shared/Select";
import { MethodBadge } from "../../../components/shared/MethodBadge";
import { useStore } from "../../../store";
import type {
  HmacAlgorithm,
  WebhookEndpoint,
  WebhookEntry,
  WebhookValidationConfig,
} from "../../../types";
import {
  deleteWebhookEndpoint,
  setWebhookConfig,
} from "../../webhook/api";
import { useClearWebhookLogs, useWebhookLogs } from "../../webhook/useWebhookLogs";
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
  const patch = (p: Partial<WebhookValidationConfig>) => onChange({ ...config, ...p });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">Type</label>
        <Select
          value={config.type}
          onChange={(e) => patch({ type: e.target.value as WebhookValidationConfig["type"] })}
          size="xs"
          wrapperClassName="flex-1"
        >
          <option value="none">None</option>
          <option value="hmac">HMAC Signature</option>
          <option value="header">Header Token</option>
        </Select>
      </div>

      {config.type === "hmac" && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">Algorithm</label>
            <Select
              value={config.algorithm ?? "sha256"}
              onChange={(e) => patch({ algorithm: e.target.value as HmacAlgorithm })}
              size="xs"
              wrapperClassName="flex-1"
            >
              <option value="sha256">SHA-256</option>
              <option value="sha1">SHA-1</option>
              <option value="sha512">SHA-512</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">Secret</label>
            <input
              type="password"
              value={config.secret ?? ""}
              onChange={(e) => patch({ secret: e.target.value })}
              placeholder="your-webhook-secret"
              className="input text-xs py-0.5 flex-1 font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">Sig. header</label>
            <input
              value={config.signatureHeader ?? ""}
              onChange={(e) => patch({ signatureHeader: e.target.value })}
              placeholder="X-Hub-Signature-256"
              className="input text-xs py-0.5 flex-1 font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">Prefix</label>
            <input
              value={config.signaturePrefix ?? ""}
              onChange={(e) => patch({ signaturePrefix: e.target.value })}
              placeholder="sha256= (optional)"
              className="input text-xs py-0.5 flex-1 font-mono"
            />
          </div>
        </>
      )}

      {config.type === "header" && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">Header</label>
            <input
              value={config.headerName ?? ""}
              onChange={(e) => patch({ headerName: e.target.value })}
              placeholder="X-Webhook-Token"
              className="input text-xs py-0.5 flex-1 font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">Expected</label>
            <input
              type="password"
              value={config.headerValue ?? ""}
              onChange={(e) => patch({ headerValue: e.target.value })}
              placeholder="secret-token"
              className="input text-xs py-0.5 flex-1 font-mono"
            />
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button onClick={onSave} disabled={saving} className="btn text-2xs py-0.5 px-3">
          {saving ? "Saving..." : "Apply"}
        </button>
      </div>
    </div>
  );
}

function HistoryLog({
  entries,
  hasValidation,
  onClear,
  onRefresh,
  loadingLogs,
}: {
  entries: WebhookEntry[];
  hasValidation: boolean;
  onClear: () => void;
  onRefresh: () => void;
  loadingLogs: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xs text-[var(--text-3)]">
          {entries.length} {entries.length === 1 ? "request" : "requests"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className={`text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 transition-colors ${loadingLogs ? "animate-spin" : ""}`}
            title="Refresh"
          >
            <RefreshCw size={11} />
          </button>
          {entries.length > 0 && (
            <button
              onClick={onClear}
              className="text-2xs text-[var(--text-3)] hover:text-[var(--danger)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-[var(--text-3)] text-center py-6">
          Waiting for requests...
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const passed = entry.validationPassed;
            return (
              <div
                key={entry.id}
                style={{ border: "1px solid var(--line-1)", borderRadius: "var(--r-3)", overflow: "hidden" }}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                  style={{ background: isExpanded ? "var(--bg-3)" : undefined }}
                  onMouseEnter={(e) => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; }}
                  onMouseLeave={(e) => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = ""; }}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <span style={{ color: "var(--fg-3)", flexShrink: 0 }}>
                    {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  </span>
                  <span className="font-mono shrink-0" style={{ fontSize: 10, color: "var(--fg-3)" }}>
                    {formatTime(entry.createdAt)}
                  </span>
                  <MethodBadge method={entry.method} />
                  <span className="flex-1" />
                  {hasValidation && (
                    <span
                      className="font-mono shrink-0"
                      style={{ fontSize: 10, fontWeight: 600, color: passed ? "var(--ok)" : "var(--danger)" }}
                      title={entry.validationError ?? "OK"}
                    >
                      {passed ? "OK" : "FAIL"}
                    </span>
                  )}
                  {!passed && entry.validationError && (
                    <span className="font-mono text-[var(--danger)] truncate" style={{ fontSize: 10, maxWidth: 160 }}>
                      {entry.validationError}
                    </span>
                  )}
                </div>
                {isExpanded && (
                  <div
                    className="flex flex-col gap-3 px-3 py-3"
                    style={{ borderTop: "1px solid var(--line-1)", background: "var(--bg-1)" }}
                  >
                    {entry.headers.filter((h) => h.enabled !== false).length > 0 && (
                      <div>
                        <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
                          Headers
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {entry.headers.filter((h) => h.enabled !== false).map((h, i) => (
                            <div key={i} className="flex gap-2 font-mono" style={{ fontSize: 11 }}>
                              <span className="text-[var(--text-3)] shrink-0">{h.key}:</span>
                              <span className="text-[var(--text-1)] break-all">{h.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {entry.body && (
                      <div>
                        <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-1.5">
                          Body
                        </p>
                        <pre
                          className="font-mono text-[var(--text-1)] whitespace-pre-wrap break-all rounded p-2"
                          style={{ fontSize: 11, background: "var(--bg-3)" }}
                        >
                          {entry.body}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WebhookModal({
  endpoint,
  onClose,
  onUpdate,
}: {
  endpoint: WebhookEndpoint;
  onClose: () => void;
  onUpdate: (id: string, label: string, validation: WebhookValidationConfig) => void;
}) {
  const { addToast } = useStore();
  const [tab, setTab] = useState<"config" | "history">("config");
  const [label, setLabel] = useState(endpoint.label);
  const [validation, setValidation] = useState<WebhookValidationConfig>(endpoint.validation);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: entries = [], isFetching: loadingLogs, refetch: refetchLogs } = useWebhookLogs(
    endpoint.id,
    tab === "history",
  );
  const clearLogsMutation = useClearWebhookLogs(endpoint.id);

  const serverBase = `${window.location.protocol}//${window.location.hostname}:4000`;
  const url = `${serverBase}/webhook/${endpoint.id}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const applyConfig = async () => {
    setSaving(true);
    try {
      await setWebhookConfig(endpoint.id, validation);
      onUpdate(endpoint.id, label, validation);
      addToast("success", "Config saved");
    } catch (e) {
      addToast("error", String(e));
    } finally {
      setSaving(false);
    }
  };

  const clearLogs = () => {
    clearLogsMutation.mutate(undefined, {
      onError: (e) => addToast("error", String(e)),
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col"
        style={{
          width: 600,
          maxHeight: "100vh",
          background: "var(--bg-2)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-4)",
          boxShadow: "var(--shadow-pop)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ background: "var(--bg-1)", borderBottom: "1px solid var(--line-1)" }}
        >
          <span style={{ fontSize: "var(--t-base)", fontWeight: 600, color: "var(--fg-0)" }}>
            {label}
          </span>
          <button
            onClick={onClose}
            className="p-0.5 rounded"
            style={{ color: "var(--fg-3)", transition: "color var(--dur-fast)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-0)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-3)")}
          >
            <X size={13} />
          </button>
        </div>

        {/* URL strip */}
        <div
          className="flex items-center gap-2 px-4 py-2 shrink-0"
          style={{ background: "var(--bg-0)", borderBottom: "1px solid var(--line-1)" }}
        >
          <span
            className="font-mono shrink-0"
            style={{ fontSize: "var(--t-xs)", color: "var(--method-post)", fontWeight: 600 }}
          >
            POST
          </span>
          <span
            className="flex-1 font-mono truncate"
            style={{ fontSize: "var(--t-xs)", color: "var(--fg-2)" }}
          >
            {url}
          </span>
          <button
            onClick={copyUrl}
            className="shrink-0 flex items-center gap-1"
            style={{ color: "var(--fg-3)", fontSize: "var(--t-xs)", transition: "color var(--dur-fast)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--accent)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-3)")}
          >
            {copied
              ? <span style={{ color: "var(--ok)", fontSize: "var(--t-xs)" }}>copied</span>
              : <Copy size={11} />}
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex shrink-0 px-4"
          style={{ background: "var(--bg-1)", borderBottom: "1px solid var(--line-1)" }}
        >
          {(["config", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-1 py-2.5 mr-4"
              style={{
                fontSize: "var(--t-xs)",
                fontWeight: 500,
                color: tab === t ? "var(--fg-0)" : "var(--fg-3)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
                textTransform: "capitalize",
                transition: "color var(--dur-fast)",
              }}
            >
              {t}
              {t === "history" && entries.length > 0 && (
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    background: "var(--bg-3)",
                    color: "var(--fg-2)",
                    borderRadius: "var(--r-2)",
                    padding: "0 4px",
                    lineHeight: "16px",
                  }}
                >
                  {entries.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={`flex-1 p-4 ${tab === "history" ? "overflow-auto" : "overflow-visible"}`}>
          {tab === "config" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <label className="text-2xs text-[var(--text-3)] w-20 shrink-0">Label</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="input text-xs py-0.5 flex-1"
                  placeholder="Endpoint label"
                />
              </div>
              <ValidationConfigForm
                config={validation}
                onChange={setValidation}
                onSave={applyConfig}
                saving={saving}
              />
            </div>
          )}
          {tab === "history" && (
            <HistoryLog
              entries={entries}
              hasValidation={validation.type !== "none"}
              onClear={clearLogs}
              onRefresh={() => refetchLogs()}
              loadingLogs={loadingLogs}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function WebhookSection() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [activeEndpoint, setActiveEndpoint] = useState<WebhookEndpoint | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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
    } catch (_e) { /* ignore */ }
    setEndpoints((prev) => prev.filter((e) => e.id !== id));
    if (activeEndpoint?.id === id) setActiveEndpoint(null);
  };

  const updateEndpoint = (id: string, label: string, validation: WebhookValidationConfig) =>
    setEndpoints((prev) => prev.map((e) => (e.id === id ? { ...e, label, validation } : e)));

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

      {endpoints.map((ep) => (
        <div
          key={ep.id}
          className="group flex items-center gap-2 px-3 py-2 border-t border-[var(--border)] hover:bg-[var(--surface-2)]"
        >
          <span className="flex-1 text-xs text-[var(--text-1)] truncate">{ep.label}</span>
          {ep.validation.type !== "none" && (
            <span className="text-2xs bg-[var(--accent-subtle)] text-[var(--accent)] rounded px-1 shrink-0">
              {ep.validation.type}
            </span>
          )}
          <button
            onClick={() => copyUrl(ep.id)}
            title="Copy URL"
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 shrink-0"
          >
            {copied === ep.id
              ? <span className="text-2xs text-[var(--ok)]">Copied</span>
              : <Copy size={11} />}
          </button>
          <button
            onClick={() => setActiveEndpoint(ep)}
            title="Configure"
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5 shrink-0"
          >
            <Settings size={11} />
          </button>
          <button
            onClick={() => removeEndpoint(ep.id)}
            title="Delete Webhook"
            className="text-[var(--text-3)] hover:text-[var(--danger)] p-0.5 shrink-0"
          >
            <Trash2 size={11} />
          </button>
        </div>
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
