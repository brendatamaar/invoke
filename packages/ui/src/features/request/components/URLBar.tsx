import { useMemo, useRef, useState } from "react";
import { Zap, RefreshCw, Layers, X, GitMerge, Repeat } from "lucide-react";
import { useStore } from "../../../store";
import { VariableAutocompleteInput } from "../../../components/shared/VariableAutocompleteInput";
import {
  resolveTemplate,
  variablesFromScopes,
  parseCurl,
  type HttpMethod,
  type KeyValue,
  type VariableScope,
} from "@invoke/core";
import type { URLBarProps } from "../../../types";

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-700",
  POST: "text-blue-700",
  PUT: "text-amber-700",
  PATCH: "text-violet-700",
  DELETE: "text-red-700",
  HEAD: "text-zinc-600",
  OPTIONS: "text-zinc-600",
};

export function URLBar({ onSend, loading }: URLBarProps) {
  const {
    request,
    setRequest,
    streamMode,
    set,
    environments,
    activeEnvironmentId,
    sessionVariables,
    loadController,
  } = useStore();
  const color = METHOD_COLORS[request.method] ?? "text-zinc-600";
  const followRedirects = request.options?.followRedirects ?? true;
  const [showSendN, setShowSendN] = useState(false);
  const [sendCount, setSendCount] = useState(5);
  const sendNRef = useRef<HTMLDivElement>(null);

  const unresolved = useMemo(() => {
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const scopes: VariableScope[] = [
      { name: "environment", variables: env?.variables ?? [] },
      { name: "session", variables: sessionVariables },
    ];
    return resolveTemplate(request.url, variablesFromScopes(scopes)).unresolved;
  }, [activeEnvironmentId, environments, request.url, sessionVariables]);
  const hasMissingVariables = unresolved.length > 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Method selector */}
      <select
        value={request.method}
        onChange={(e) => setRequest({ method: e.target.value as HttpMethod })}
        className={`bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs font-semibold font-mono w-24 outline-none focus:border-[var(--accent)] cursor-pointer ${color}`}
      >
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      {/* URL input with variable autocomplete + paste-cURL detection */}
      <div className="flex-1 min-w-0">
        <VariableAutocompleteInput
          value={request.url}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (text.trimStart().startsWith("curl ")) {
              e.preventDefault();
              const parsed = parseCurl(text);
              if (parsed.url) setRequest({ ...parsed } as any);
            }
          }}
          onChange={(url) => {
            const qIdx = url.indexOf("?");
            if (qIdx !== -1) {
              const qs = url.slice(qIdx + 1);
              const urlParams: KeyValue[] = [];
              new URLSearchParams(qs).forEach((value, key) => {
                if (key) urlParams.push({ key, value, enabled: true });
              });
              const disabled = request.params.filter(
                (p) => p.enabled === false,
              );
              setRequest({ url, params: [...urlParams, ...disabled] });
            } else {
              setRequest({ url });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSend();
          }}
          placeholder="https://api.example.com/endpoint"
          className={`w-full bg-[var(--surface-2)] border rounded px-3 py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:bg-[var(--surface)] transition-colors ${
            hasMissingVariables
              ? "border-[var(--warn)] focus:border-[var(--warn)]"
              : "border-[var(--border)] focus:border-[var(--accent)]"
          }`}
        />
        {hasMissingVariables && (
          <p className="mt-1 text-2xs text-[var(--warn)] truncate">
            Missing variables: {unresolved.join(", ")}
          </p>
        )}
      </div>

      {/* Follow-redirects toggle */}
      <button
        onClick={() =>
          setRequest({
            options: { ...request.options, followRedirects: !followRedirects },
          })
        }
        title={
          followRedirects
            ? "Following redirects (click to disable)"
            : "Not following redirects (click to enable)"
        }
        className={`p-1.5 rounded border text-xs transition-colors ${followRedirects ? "border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)]" : "border-amber-500 text-amber-500"}`}
      >
        <GitMerge size={13} />
      </button>

      {/* Send N times */}
      <div className="relative" ref={sendNRef}>
        <button
          onClick={() => setShowSendN((v) => !v)}
          title="Send N times"
          className="p-1.5 rounded border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
        >
          <Repeat size={13} />
        </button>
        {showSendN && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded shadow-lg p-2 flex items-center gap-2 min-w-36">
            <span className="text-2xs text-[var(--text-2)] whitespace-nowrap">
              Send
            </span>
            <input
              type="number"
              min={1}
              max={500}
              value={sendCount}
              onChange={(e) =>
                setSendCount(Math.max(1, Number(e.target.value)))
              }
              className="input text-xs py-0.5 w-14"
              autoFocus
            />
            <span className="text-2xs text-[var(--text-2)]">times</span>
            <button
              onClick={() => {
                setShowSendN(false);
                set({ showBatchRunner: true });
              }}
              className="btn btn-primary text-2xs py-0.5 px-2"
            >
              Go
            </button>
          </div>
        )}
      </div>

      {/* Batch runner */}
      <button
        onClick={() => set({ showBatchRunner: true })}
        title="Batch runner"
        className="p-1.5 rounded border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
      >
        <Layers size={13} />
      </button>

      {/* Stream toggle */}
      <button
        onClick={() => set({ streamMode: !streamMode })}
        title="Stream mode"
        className={`p-1.5 rounded border text-xs transition-colors ${streamMode ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)]"}`}
      >
        <Zap size={13} />
      </button>

      {/* Cancel button (non-stream loading) */}
      {loading && loadController && (
        <button
          onClick={() => loadController.abort()}
          className="btn btn-danger px-3 gap-1 text-xs"
          title="Cancel request"
        >
          <X size={13} /> Cancel
        </button>
      )}

      {/* Send button */}
      <button
        onClick={onSend}
        disabled={loading || !request.url.trim()}
        className="btn btn-primary px-4 gap-1.5 text-xs"
      >
        {loading ? <RefreshCw size={13} className="animate-spin" /> : null}
        {loading ? "Sending…" : "Send"}
      </button>
    </div>
  );
}
