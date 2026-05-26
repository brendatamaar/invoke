import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeftRight, CheckCircle2, Circle, Copy, Indent, Trash2, X } from "lucide-react";
import { useAutoScroll, CollapsibleBody, ScrollToBottomBtn } from "./GrpcStreamShared";
import type { Assertion, GrpcExecuteResponse, GrpcStreamMessage } from "@invoke/core";
import { useStore } from "../../../store";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { GrpcDeadlineCountdown } from "./GrpcDeadlineCountdown";

type GrpcExecuteResponseWithDetails = GrpcExecuteResponse & {
  statusDetailsJson?: string;
};

type ResponseTab = "body" | "metadata" | "assertions";

type UnaryProps = {
  mode: "unary";
  res: GrpcExecuteResponse;
};

type StreamProps = {
  mode: "stream";
  messages: GrpcStreamMessage[];
  grpcStreaming: boolean;
  diffSelected: number[];
  onToggleDiff: (i: number) => void;
  onClearDiff: () => void;
  onOpenDiff: () => void;
  onClear: () => void;
};

export function GrpcResponsePanel(props: UnaryProps | StreamProps) {
  const { grpcAssertionResults, grpcRequest, grpcSentMetadata, addToast } = useStore();
  const assertionRules: Assertion[] = grpcRequest.assertions ?? [];
  const [activeTab, setActiveTab] = useState<ResponseTab>("body");
  const [prettyBody, setPrettyBody] = useState(true);

  const isUnary = props.mode === "unary";

  const doneMsg = !isUnary ? props.messages.find((m) => m.done) : undefined;
  const isOk = isUnary
    ? !props.res.error && props.res.statusCode === 0
    : !doneMsg?.error;

  const metadataEntries = isUnary
    ? [...(props.res.metadata ?? []), ...grpcSentMetadata]
    : [...grpcSentMetadata];
  const trailerEntries = isUnary
    ? (props.res.trailers ?? [])
    : (doneMsg?.trailers ?? []);
  const metadataCount = metadataEntries.length + trailerEntries.length;
  const hasMetadata = metadataCount > 0;

  const passedCount = grpcAssertionResults.filter((r) => r.passed).length;
  const totalCount = grpcAssertionResults.length;
  const allPassed = passedCount === totalCount;
  const hasAssertions = totalCount > 0;

  const effectiveTab =
    (activeTab === "metadata" && !hasMetadata) ||
      (activeTab === "assertions" && !hasAssertions)
      ? "body"
      : activeTab;

  const bodyJson = isUnary ? props.res.bodyJson : null;
  const displayBody = useMemo(() => {
    if (!bodyJson) return "";
    if (prettyBody) return bodyJson;
    try {
      return JSON.stringify(JSON.parse(bodyJson));
    } catch {
      return bodyJson;
    }
  }, [bodyJson, prettyBody]);

  const copyBody = () => {
    if (!bodyJson) return;
    navigator.clipboard
      .writeText(bodyJson)
      .catch((e: unknown) =>
        addToast(
          "error",
          `Copy failed: ${e instanceof Error ? e.message : String(e)}`,
        ),
      );
  };

  const receivedStreamCount = !isUnary
    ? props.messages.filter((m) => !m.done && m.bodyJson).length
    : 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2 shrink-0">
        {isUnary ? (
          <>
            <span
              className={`text-xs font-semibold ${isOk ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
            >
              {props.res.statusCode}{" "}
              {props.res.statusCode === 0
                ? "OK"
                : (props.res.statusMessage ?? String(props.res.statusCode))}
            </span>
            {props.res.durationMs != null && (
              <>
                <span className="text-[var(--text-3)] text-2xs select-none">
                  ·
                </span>
                <span className="text-2xs font-mono text-[var(--text-3)]">
                  {props.res.durationMs.toFixed(0)}ms
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
          </>
        ) : (
          <>
            <span className="text-2xs text-[var(--text-3)]">
              Stream messages
            </span>
            {props.grpcStreaming && (
              <span className="flex items-center gap-1 text-[var(--accent)] text-2xs">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                live
              </span>
            )}
            <GrpcDeadlineCountdown />
            {receivedStreamCount > 0 && (
              <span className="ml-auto flex items-center gap-1 text-2xs text-[var(--ok)]">
                {receivedStreamCount} received
              </span>
            )}
            {props.messages.length > 0 && (
              <button
                className="p-0.5 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
                title="Clear messages (Ctrl+L)"
                onClick={props.onClear}
              >
                <Trash2 size={11} />
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)] shrink-0">
        <button
          onClick={() => setActiveTab("body")}
          className={`tab-btn text-2xs ${effectiveTab === "body" ? "active" : ""}`}
        >
          {isUnary ? "Body" : "Messages"}
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
        {effectiveTab === "body" && isUnary && bodyJson && (
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
        {effectiveTab === "body" && isUnary && (
          <div className="flex-1 min-h-0 overflow-auto">
            {bodyJson && <CodeEditor value={displayBody} lang="json" readOnly />}
            {props.res.error && !bodyJson && (
              <p className="p-3 text-2xs text-[var(--danger)]">
                {props.res.error}
              </p>
            )}
            {(props.res as GrpcExecuteResponseWithDetails).statusDetailsJson && (
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
                  {(props.res as GrpcExecuteResponseWithDetails).statusDetailsJson}
                </pre>
              </div>
            )}
            {!bodyJson &&
              !props.res.error &&
              !(props.res as GrpcExecuteResponseWithDetails).statusDetailsJson && (
                <p className="p-3 text-2xs text-[var(--text-3)]">No body</p>
              )}
          </div>
        )}

        {effectiveTab === "body" && !isUnary && (
          <StreamMessageList
            messages={props.messages}
            grpcStreaming={props.grpcStreaming}
            diffSelected={props.diffSelected}
            onToggleDiff={props.onToggleDiff}
            onClearDiff={props.onClearDiff}
            onOpenDiff={props.onOpenDiff}
          />
        )}

        {effectiveTab === "metadata" && (
          <div className="flex-1 overflow-auto">
            {metadataEntries.length > 0 && (
              <MetadataSection
                label="Metadata"
                entries={metadataEntries}
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
            {trailerEntries.length > 0 && (
              <MetadataSection
                label="Trailers"
                entries={trailerEntries}
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
                      <p className="text-xs text-[var(--text-1)]">{r.message}</p>
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

function StreamMessageList({
  messages,
  grpcStreaming,
  diffSelected,
  onToggleDiff,
  onClearDiff,
  onOpenDiff,
}: {
  messages: GrpcStreamMessage[];
  grpcStreaming: boolean;
  diffSelected: number[];
  onToggleDiff: (i: number) => void;
  onClearDiff: () => void;
  onOpenDiff: () => void;
}) {
  const { addToast } = useStore();
  const { scrollRef, showScrollBtn, handleScroll, scrollToBottom } = useAutoScroll(messages.length, grpcStreaming);

  const copyMessage = (body: string) => {
    navigator.clipboard
      .writeText(body)
      .catch((e: unknown) =>
        addToast("error", `Copy failed: ${e instanceof Error ? e.message : String(e)}`),
      );
  };

  const firstArrival = messages.find((m) => m.receivedAt)?.receivedAt;

  return (
    <div className="flex-1 min-h-0 relative overflow-hidden">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto"
        onScroll={handleScroll}
      >
        {messages.length === 0 && !grpcStreaming && (
          <p className="p-3 text-2xs text-[var(--text-3)]">No messages yet.</p>
        )}
        {messages.map((msg, i) => {
          if (!msg.done && !msg.bodyJson) return null;

          const relativeMs =
            firstArrival != null && msg.receivedAt != null && msg.receivedAt > firstArrival
              ? msg.receivedAt - firstArrival
              : null;

          if (msg.done) {
            return (
              <div
                key={i}
                className="px-3 py-2 border-b border-[var(--border)] last:border-0 bg-[var(--surface-2)]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-2xs font-semibold ${msg.error ? "text-[var(--danger)]" : "text-[var(--ok)]"}`}
                  >
                    {msg.error
                      ? `Error: ${msg.statusMessage || msg.error}`
                      : `Completed  ${msg.durationMs?.toFixed(0)}ms`}
                  </span>
                  {msg.trailers && msg.trailers.length > 0 && (
                    <span className="text-2xs text-[var(--text-3)]">
                      {msg.trailers.map((t) => `${t.key}: ${t.value}`).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            );
          }

          const isSelected = diffSelected.includes(i);
          const showCheckbox = isSelected || diffSelected.length > 0;

          return (
            <div
              key={i}
              className={`group flex items-start gap-2 px-3 py-2 border-b border-[var(--border)] last:border-0 transition-colors ${isSelected ? "bg-[var(--accent-subtle)]" : "hover:bg-[var(--surface-2)]"}`}
            >
              <button
                onClick={() => onToggleDiff(i)}
                title={isSelected ? "Deselect" : "Select for diff"}
                className={`mt-0.5 shrink-0 transition-opacity ${showCheckbox ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${isSelected ? "text-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--accent)]"}`}
              >
                {isSelected ? <CheckCircle2 size={13} /> : <Circle size={13} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-2xs font-mono font-medium text-[var(--text-3)] shrink-0">
                    #{i}
                  </span>
                  {relativeMs != null && (
                    <span className="text-2xs text-[var(--text-3)]">+{relativeMs}ms</span>
                  )}
                  <button
                    className="ml-auto p-0.5 text-[var(--text-3)] hover:text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy message"
                    onClick={() => msg.bodyJson && copyMessage(msg.bodyJson)}
                  >
                    <Copy size={10} />
                  </button>
                </div>
                <CollapsibleBody text={msg.bodyJson ?? ""} />
              </div>
            </div>
          );
        })}
      </div>

      {diffSelected.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border)] px-3 py-1.5 flex items-center gap-2 bg-[var(--surface-2)] shrink-0">
          <ArrowLeftRight size={11} className="text-[var(--accent)] shrink-0" />
          <span className="text-2xs text-[var(--text-2)] flex-1">
            {diffSelected.length === 1 ? "Select one more to diff" : "2 messages selected"}
          </span>
          {diffSelected.length === 2 && (
            <button onClick={onOpenDiff} className="btn btn-primary text-2xs px-2">
              Open diff
            </button>
          )}
          <button onClick={onClearDiff} className="p-0.5 text-[var(--text-3)] hover:text-[var(--text-1)]">
            <X size={11} />
          </button>
        </div>
      )}

      <ScrollToBottomBtn
        show={showScrollBtn}
        onClick={scrollToBottom}
        offset={diffSelected.length > 0}
      />
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
