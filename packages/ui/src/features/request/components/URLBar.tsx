import { useMemo, useRef, useState } from "react";
import { Select } from "../../../components/shared/Select";
import { Zap, RefreshCw, Layers, X, Braces } from "lucide-react";
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
  GET: "text-[var(--method-get)]",
  POST: "text-[var(--method-post)]",
  PUT: "text-[var(--method-put)]",
  PATCH: "text-[var(--method-patch)]",
  DELETE: "text-[var(--method-delete)]",
  HEAD: "text-[var(--fg-2)]",
  OPTIONS: "text-[var(--fg-2)]",
};

const SCOPE_LABEL: Record<string, string> = {
  environment: "env",
  collection: "collection",
  folder: "folder",
  session: "session",
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
    collections,
    folders,
    requests: savedRequests,
  } = useStore();
  const color = METHOD_COLORS[request.method] ?? "text-[var(--fg-2)]";
  const [showVars, setShowVars] = useState(false);
  const varsRef = useRef<HTMLDivElement>(null);

  const { unresolved, scopedVars } = useMemo(() => {
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const savedReq = request.id
      ? savedRequests.find((r) => r.id === request.id)
      : undefined;
    const collectionId = savedReq?.collectionId ?? request.collectionId;
    const folderId = savedReq?.folderId ?? request.folderId;
    const collection = collections.find((c) => c.id === collectionId);
    const folder = folders.find((f) => f.id === folderId);

    const scopes: VariableScope[] = [
      { name: "environment", variables: env?.variables ?? [] },
      { name: "collection", variables: collection?.variables ?? [] },
      { name: "folder", variables: folder?.variables ?? [] },
      { name: "session", variables: sessionVariables },
    ];

    const merged = variablesFromScopes(scopes);
    const unresolved = resolveTemplate(request.url, merged).unresolved;

    // Build per-variable source info for the tooltip
    const seen = new Set<string>();
    const scopedVars: { key: string; value: string; scope: string }[] = [];
    for (let i = scopes.length - 1; i >= 0; i--) {
      const scope = scopes[i];
      const scopeVars = Array.isArray(scope.variables)
        ? scope.variables.filter(
            (v) => v.enabled !== false && v.key.trim(),
          )
        : Object.entries(scope.variables as Record<string, string>).map(
            ([key, value]) => ({ key, value, enabled: true }),
          );
      for (const v of scopeVars) {
        if (!seen.has(v.key)) {
          seen.add(v.key);
          scopedVars.push({
            key: v.key,
            value: (v as KeyValue).sensitive ? "••••••" : v.value,
            scope: scope.name ?? "",
          });
        }
      }
    }
    scopedVars.sort((a, b) => a.key.localeCompare(b.key));

    return { unresolved, scopedVars };
  }, [
    activeEnvironmentId,
    collections,
    folders,
    environments,
    request.collectionId,
    request.folderId,
    request.id,
    request.url,
    savedRequests,
    sessionVariables,
  ]);

  const hasMissingVariables = unresolved.length > 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Method selector */}
      {request.protocol !== "graphql" && (
        <Select
          value={request.method}
          onChange={(e) => setRequest({ method: e.target.value as HttpMethod })}
          size="xs"
          wrapperClassName="w-24"
          className={`font-semibold ${color}`}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      )}

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

      {/* Variable inspector */}
      <div className="relative" ref={varsRef}>
        <button
          onClick={() => setShowVars((v) => !v)}
          title="Active variables"
          className={`p-1.5 rounded border text-xs transition-colors ${
            showVars
              ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)]"
          }`}
        >
          <Braces size={13} />
        </button>
        {showVars && (
          <div
            className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded shadow-[var(--shadow-2)] py-1"
            style={{ minWidth: 280, maxHeight: 320, overflowY: "auto" }}
          >
            <p className="px-3 py-1.5 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wide border-b border-[var(--border)]">
              Active variables
            </p>
            {scopedVars.length === 0 ? (
              <p className="px-3 py-3 text-2xs text-[var(--text-3)]">
                No variables defined
              </p>
            ) : (
              scopedVars.map((v) => (
                <div
                  key={v.key}
                  className="flex items-center gap-2 px-3 py-1 hover:bg-[var(--surface-2)]"
                >
                  <span className="font-mono text-2xs text-[var(--text-1)] flex-1 truncate">
                    {v.key}
                  </span>
                  <span className="font-mono text-2xs text-[var(--accent)] truncate max-w-28">
                    {v.value}
                  </span>
                  <span className="text-2xs text-[var(--text-3)] shrink-0">
                    {SCOPE_LABEL[v.scope] ?? v.scope}
                  </span>
                </div>
              ))
            )}
            {unresolved.length > 0 && (
              <>
                <p className="px-3 py-1.5 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wide border-t border-[var(--border)] mt-1">
                  Unresolved
                </p>
                {unresolved.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 px-3 py-1"
                  >
                    <span className="font-mono text-2xs text-[var(--warn)] flex-1">
                      {name}
                    </span>
                    <span className="text-2xs text-[var(--text-3)]">
                      not defined
                    </span>
                  </div>
                ))}
              </>
            )}
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
