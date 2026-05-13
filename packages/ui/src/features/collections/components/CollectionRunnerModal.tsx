import { useRef, useState } from "react";
import {
  X,
  Play,
  StopCircle,
  Download,
  CheckCircle2,
  XCircle,
  SkipForward,
} from "lucide-react";
import {
  CollectionRunner,
  exportRunResultJson,
  exportRunResultCsv,
  resolveRequest,
  runAssertions,
  variablesFromScopes,
  type RequestRunResult,
  type VariableScope,
} from "@invoke/core";
import { useStore } from "../../../store";
import { execute } from "../../execute/api";
import { MethodBadge } from "../../../components/shared/MethodBadge";
import { StatusBadge } from "../../../components/shared/StatusBadge";

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CollectionRunnerModal() {
  const {
    showCollectionRunner,
    collectionRunnerTarget,
    collectionRunResult,
    collectionRunning,
    requests,
    folders,
    environments,
    activeEnvironmentId,
    sessionVariables,
    set,
    addToast,
  } = useStore();

  const [stopOnFailure, setStopOnFailure] = useState(false);
  const [liveResults, setLiveResults] = useState<RequestRunResult[]>([]);
  const runnerRef = useRef<CollectionRunner | null>(null);

  if (!showCollectionRunner) return null;

  const close = () => {
    if (collectionRunning) return;
    set({ showCollectionRunner: false, collectionRunResult: null });
    setLiveResults([]);
  };

  const getRequests = () => {
    if (!collectionRunnerTarget) return [];
    if (collectionRunnerTarget.type === "collection") {
      return requests
        .filter(
          (r) => r.collectionId === collectionRunnerTarget.id && !r.folderId,
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return requests
      .filter((r) => r.folderId === collectionRunnerTarget.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const runRequests = getRequests();

  const handleRun = async () => {
    if (collectionRunning || runRequests.length === 0) return;
    set({ collectionRunning: true, collectionRunResult: null });
    setLiveResults([]);

    const env = environments.find((e) => e.id === activeEnvironmentId);
    const scopes: VariableScope[] = [
      { name: "environment", variables: env?.variables ?? [] },
      {
        name: "session",
        variables: Object.entries(sessionVariables).map(([key, value]) => ({
          key,
          value,
          enabled: true,
        })),
      },
    ];

    const runner = new CollectionRunner();
    runnerRef.current = runner;

    try {
      const result = await runner.run(
        runRequests,
        {
          execute,
          scopes,
          stopOnFailure,
          onRequestStart: (_req, i) => {
            setLiveResults((prev) => [
              ...prev.slice(0, i),
              {
                requestId: runRequests[i].id,
                name: runRequests[i].name,
                method:
                  (runRequests[i].request as { method?: string })?.method ??
                  "GET",
                url: (runRequests[i].request as { url?: string })?.url ?? "",
                status: "skipped",
                durationMs: 0,
              },
            ]);
          },
          onRequestComplete: (res, i) => {
            setLiveResults((prev) => {
              const next = [...prev];
              next[i] = res;
              return next;
            });
          },
        },
        {
          id: Math.random().toString(36).slice(2),
          name: collectionRunnerTarget?.name ?? "Run",
          collectionId:
            collectionRunnerTarget?.type === "collection"
              ? collectionRunnerTarget.id
              : undefined,
          folderId:
            collectionRunnerTarget?.type === "folder"
              ? collectionRunnerTarget.id
              : undefined,
        },
      );
      set({ collectionRunResult: result });
    } catch (e) {
      addToast("error", String(e));
    } finally {
      set({ collectionRunning: false });
      runnerRef.current = null;
    }
  };

  const handleCancel = () => {
    runnerRef.current?.cancel();
    set({ collectionRunning: false });
  };

  const displayResults = collectionRunResult?.results ?? liveResults;
  const runResult = collectionRunResult;

  const statusIcon = (status: RequestRunResult["status"]) => {
    if (status === "passed")
      return <CheckCircle2 size={13} className="text-[var(--ok)] shrink-0" />;
    if (status === "failed" || status === "error")
      return <XCircle size={13} className="text-[var(--danger)] shrink-0" />;
    return <SkipForward size={13} className="text-[var(--text-3)] shrink-0" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 600, maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Play size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">
            Run — {collectionRunnerTarget?.name ?? ""}
          </span>
          <span className="ml-1 text-xs text-[var(--text-3)]">
            {runRequests.length} request{runRequests.length !== 1 ? "s" : ""}
          </span>
          {!collectionRunning && (
            <button
              onClick={close}
              className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Config */}
        {!collectionRunning && !runResult && (
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[var(--border)]">
            <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer">
              <input
                type="checkbox"
                checked={stopOnFailure}
                onChange={(e) => setStopOnFailure(e.target.checked)}
              />
              Stop on failure
            </label>
          </div>
        )}

        {/* Results list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {runRequests.length === 0 && (
            <p className="p-6 text-xs text-[var(--text-3)] text-center">
              No requests in this {collectionRunnerTarget?.type ?? "collection"}
              .
            </p>
          )}
          {displayResults.map((r, i) => (
            <div
              key={r.requestId ?? i}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              {statusIcon(r.status)}
              <MethodBadge method={r.method} />
              <span className="flex-1 text-xs truncate text-[var(--text-1)]">
                {r.name || r.url}
              </span>
              {r.response && <StatusBadge status={r.response.status} />}
              <span className="text-2xs text-[var(--text-3)] w-14 text-right">
                {r.durationMs > 0 ? `${r.durationMs}ms` : ""}
              </span>
              {r.assertions && r.assertions.length > 0 && (
                <span
                  className={`text-2xs ${r.assertions.every((a) => a.passed) ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
                >
                  {r.assertions.filter((a) => a.passed).length}/
                  {r.assertions.length}
                </span>
              )}
            </div>
          ))}
          {collectionRunning &&
            displayResults.length < runRequests.length &&
            runRequests.slice(displayResults.length).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-2.5 opacity-40"
              >
                <SkipForward
                  size={13}
                  className="text-[var(--text-3)] shrink-0"
                />
                <MethodBadge
                  method={(r.request as { method?: string })?.method ?? "GET"}
                />
                <span className="flex-1 text-xs truncate text-[var(--text-2)]">
                  {r.name || (r.request as { url?: string })?.url}
                </span>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border)]">
          {runResult && (
            <div className="flex items-center gap-3 mr-auto">
              <span
                className={`text-xs font-semibold ${runResult.status === "passed" ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
              >
                {runResult.passedCount}/{runResult.results.length} passed
              </span>
              <span className="text-2xs text-[var(--text-3)]">
                {runResult.completedAt - runResult.startedAt}ms total
              </span>
              <button
                onClick={() =>
                  downloadText(
                    exportRunResultJson(runResult),
                    `run-${Date.now()}.json`,
                    "application/json",
                  )
                }
                className="btn text-2xs py-0.5 px-2 flex items-center gap-1"
              >
                <Download size={11} /> JSON
              </button>
              <button
                onClick={() =>
                  downloadText(
                    exportRunResultCsv(runResult),
                    `run-${Date.now()}.csv`,
                    "text/csv",
                  )
                }
                className="btn text-2xs py-0.5 px-2 flex items-center gap-1"
              >
                <Download size={11} /> CSV
              </button>
            </div>
          )}
          {!runResult && <div className="mr-auto" />}
          {collectionRunning ? (
            <button
              onClick={handleCancel}
              className="btn btn-danger text-xs flex items-center gap-1.5"
            >
              <StopCircle size={13} /> Cancel
            </button>
          ) : (
            <button
              onClick={
                runResult
                  ? () => {
                      set({ collectionRunResult: null });
                      setLiveResults([]);
                      handleRun();
                    }
                  : handleRun
              }
              disabled={runRequests.length === 0}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <Play size={13} /> {runResult ? "Run again" : "Run"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
