import { useMemo, useState } from "react";
import { AlertCircle, Copy, Indent } from "lucide-react";
import type { Assertion, GrpcExecuteResponse } from "@invoke/core";
import { useStore } from "../../../store";
import { CodeEditor } from "../../../components/editors/CodeEditor";

type GrpcExecuteResponseWithDetails = GrpcExecuteResponse & {
  statusDetailsJson?: string;
};

type ResponseTab = "body" | "metadata" | "assertions";

export function GrpcResponsePanel({ res }: { res: GrpcExecuteResponse }) {
  const { grpcAssertionResults, grpcRequest, addToast } = useStore();
  const assertionRules: Assertion[] = grpcRequest.assertions ?? [];
  const response = res as GrpcExecuteResponseWithDetails;
  const statusName =
    res.statusCode === 0 ? "OK" : (res.statusMessage ?? String(res.statusCode));
  const isOk = !res.error && res.statusCode === 0;
  const passedCount = grpcAssertionResults.filter((r) => r.passed).length;
  const totalCount = grpcAssertionResults.length;
  const allPassed = passedCount === totalCount;
  const metadataCount =
    (res.metadata?.length ?? 0) + (res.trailers?.length ?? 0);

  const hasMetadata = metadataCount > 0;
  const hasAssertions = totalCount > 0;

  const [activeTab, setActiveTab] = useState<ResponseTab>("body");
  const [prettyBody, setPrettyBody] = useState(true);

  const effectiveTab =
    (activeTab === "metadata" && !hasMetadata) ||
    (activeTab === "assertions" && !hasAssertions)
      ? "body"
      : activeTab;

  const displayBody = useMemo(() => {
    if (!res.bodyJson) return "";
    if (prettyBody) return res.bodyJson;
    try {
      return JSON.stringify(JSON.parse(res.bodyJson));
    } catch {
      return res.bodyJson;
    }
  }, [res.bodyJson, prettyBody]);

  const copyBody = () => {
    if (!res.bodyJson) return;
    navigator.clipboard.writeText(res.bodyJson).catch((e: unknown) =>
      addToast(
        "error",
        `Copy failed: ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2 shrink-0">
        <span
          className={`text-xs font-semibold ${isOk ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
        >
          {res.statusCode} {statusName}
        </span>
        {res.durationMs != null && (
          <>
            <span className="text-[var(--text-3)] text-2xs select-none">·</span>
            <span className="text-2xs font-mono text-[var(--text-3)]">
              {res.durationMs.toFixed(0)}ms
            </span>
          </>
        )}
        {hasAssertions && (
          <span
            className={`ml-auto text-2xs font-semibold ${allPassed ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
          >
            {passedCount}/{totalCount} assertions
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)] shrink-0">
        <button
          onClick={() => setActiveTab("body")}
          className={`tab-btn text-2xs ${effectiveTab === "body" ? "active" : ""}`}
        >
          Body
        </button>
        {hasMetadata && (
          <button
            onClick={() => setActiveTab("metadata")}
            className={`tab-btn text-2xs ${effectiveTab === "metadata" ? "active" : ""}`}
          >
            Metadata
            <span className="ml-1 px-1 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
              {metadataCount}
            </span>
          </button>
        )}
        {hasAssertions && (
          <button
            onClick={() => setActiveTab("assertions")}
            className={`tab-btn text-2xs ${effectiveTab === "assertions" ? "active" : ""}`}
          >
            Assertions
            <span
              className={`ml-1 px-1 rounded ${allPassed ? "bg-[var(--ok-bg)] text-[var(--ok)]" : "bg-[var(--danger-bg)] text-[var(--danger)]"}`}
            >
              {passedCount}/{totalCount}
            </span>
          </button>
        )}

        {effectiveTab === "body" && res.bodyJson && (
          <div className="ml-auto flex items-center gap-0.5 border-l border-[var(--border)] pl-2">
            <button
              onClick={() => setPrettyBody((v) => !v)}
              className={`p-0.5 ${prettyBody ? "text-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--accent)]"}`}
              title="Toggle pretty print"
            >
              <Indent size={11} />
            </button>
            <button
              onClick={copyBody}
              className="p-0.5 text-[var(--text-3)] hover:text-[var(--accent)]"
              title="Copy response body"
            >
              <Copy size={11} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {effectiveTab === "body" && (
          <div className="flex-1 min-h-0 overflow-auto">
            {res.bodyJson && (
              <CodeEditor value={displayBody} lang="json" readOnly />
            )}
            {res.error && !res.bodyJson && (
              <p className="p-3 text-2xs text-[var(--danger)]">{res.error}</p>
            )}
            {response.statusDetailsJson && (
              <div className="m-3 rounded border border-[var(--danger-bg)] bg-[var(--danger-bg)] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle
                    size={12}
                    className="text-[var(--danger)] shrink-0"
                  />
                  <span className="text-2xs font-semibold text-[var(--danger)]">
                    Error Details
                  </span>
                </div>
                <pre className="text-2xs font-mono text-[var(--danger)] whitespace-pre-wrap break-all opacity-80">
                  {response.statusDetailsJson}
                </pre>
              </div>
            )}
            {!res.bodyJson && !res.error && !response.statusDetailsJson && (
              <p className="p-3 text-2xs text-[var(--text-3)]">No body</p>
            )}
          </div>
        )}

        {effectiveTab === "metadata" && (
          <div className="flex-1 overflow-auto">
            {res.metadata && res.metadata.length > 0 && (
              <MetadataSection
                label="Metadata"
                entries={res.metadata}
                onCopy={(v) =>
                  navigator.clipboard
                    .writeText(v)
                    .catch((e: unknown) =>
                      addToast(
                        "error",
                        `Copy failed: ${e instanceof Error ? e.message : String(e)}`,
                      ),
                    )
                }
              />
            )}
            {res.trailers && res.trailers.length > 0 && (
              <MetadataSection
                label="Trailers"
                entries={res.trailers}
                onCopy={(v) =>
                  navigator.clipboard
                    .writeText(v)
                    .catch((e: unknown) =>
                      addToast(
                        "error",
                        `Copy failed: ${e instanceof Error ? e.message : String(e)}`,
                      ),
                    )
                }
              />
            )}
          </div>
        )}

        {effectiveTab === "assertions" && (
          <div className="flex-1 overflow-auto divide-y divide-[var(--border)]">
            {grpcAssertionResults.map((r, i) => {
              const rule = assertionRules.find((a) => a.id === r.assertionId);
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 px-3 py-3 ${r.passed ? "" : "bg-[var(--danger-bg)]"}`}
                >
                    <span
                      className={`mt-0.5 text-2xs font-bold shrink-0 px-1.5 py-0.5 rounded ${r.passed ? "bg-[var(--ok-bg)] text-[var(--ok)]" : "bg-[var(--danger-bg)] text-[var(--danger)]"}`}
                    >
                      {r.passed ? "OK" : "ERR"}
                    </span>
                    <div className="flex-1 min-w-0">
                      {rule ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <code className="px-1 py-0.5 rounded bg-[var(--surface-2)] text-2xs font-mono text-[var(--text-2)]">
                            {rule.type}
                          </code>
                          <span className="text-2xs text-[var(--text-3)]">
                            {rule.matcher}
                          </span>
                          <code className="px-1 py-0.5 rounded bg-[var(--surface-2)] text-2xs font-mono text-[var(--text-1)]">
                            {rule.expected}
                          </code>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--text-1)]">
                          {r.message}
                        </p>
                      )}
                      {!r.passed && r.actual !== undefined && (
                        <p className="text-2xs font-mono text-[var(--text-3)] mt-1.5">
                          got:{" "}
                          <span className="text-[var(--danger)]">
                            {String(r.actual)}
                          </span>
                        </p>
                      )}
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MetadataSection({
  label,
  entries,
  onCopy,
}: {
  label: string;
  entries: { key: string; value: string }[];
  onCopy: (value: string) => void;
}) {
  return (
    <div>
      <p className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-[var(--text-3)] bg-[var(--surface-2)] border-b border-[var(--border)] sticky top-0">
        {label}
      </p>
      <div className="divide-y divide-[var(--border)]">
        {entries.map((h, i) => (
          <div
            key={i}
            className="group flex items-start gap-2 px-3 py-2 hover:bg-[var(--surface-2)]"
          >
            <span className="text-2xs font-mono font-medium text-[var(--text-2)] w-48 shrink-0 truncate">
              {h.key}
            </span>
            <span className="text-2xs font-mono text-[var(--text-3)] break-all flex-1">
              {h.value}
            </span>
            <button
              onClick={() => onCopy(h.value)}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--accent)] p-0.5 shrink-0"
              title="Copy value"
            >
              <Copy size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
