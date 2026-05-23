import { useRef, useState } from "react";
import { X, Zap, StopCircle } from "lucide-react";
import {
  BatchRunner,
  resolveRequest,
  type VariableScope,
} from "@invoke/core";
import { useStore } from "../../../store";
import { execute } from "../../execute/api";

export function BatchRunnerModal() {
  const {
    showBatchRunner,
    batchRunResult,
    batchRunning,
    request,
    environments,
    activeEnvironmentId,
    sessionVariables,
    set,
    addToast,
  } = useStore();

  const [iterations, setIterations] = useState(10);
  const [concurrency, setConcurrency] = useState(1);
  const [delayMs, setDelayMs] = useState(0);
  const [stopOnFailure, setStopOnFailure] = useState(false);
  const [progress, setProgress] = useState(0);
  const runnerRef = useRef<BatchRunner | null>(null);

  if (!showBatchRunner) return null;

  const close = () => {
    if (batchRunning) return;
    set({ showBatchRunner: false, batchRunResult: null });
    setProgress(0);
  };

  const handleRun = async () => {
    if (batchRunning || !request.url.trim()) return;
    set({ batchRunning: true, batchRunResult: null });
    setProgress(0);

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
    const { request: resolved } = resolveRequest(
      request as import("@invoke/core").RequestConfig,
      scopes,
    );

    const runner = new BatchRunner();
    runnerRef.current = runner;

    try {
      const stats = await runner.run(
        resolved,
        execute,
        { iterations, concurrency, delayMs, stopOnFailure },
        (done, total) => setProgress(Math.round((done / total) * 100)),
      );
      set({ batchRunResult: stats });
    } catch (e) {
      addToast("error", String(e));
    } finally {
      set({ batchRunning: false });
      runnerRef.current = null;
    }
  };

  const handleCancel = () => {
    runnerRef.current?.cancel();
    set({ batchRunning: false });
  };

  const result = batchRunResult;

  const StatCell = ({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) => (
    <div className="flex flex-col gap-0.5 p-2.5 rounded border border-[var(--border)] bg-[var(--surface-2)] text-center">
      <span className="text-xs font-semibold text-[var(--text-1)]">
        {value}
      </span>
      <span className="text-2xs text-[var(--text-3)]">{label}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 500, maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Zap size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">Batch Runner</span>
          {!batchRunning && (
            <button
              onClick={close}
              className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Config */}
          {!batchRunning && !result && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-2xs text-[var(--text-3)]">
                  Iterations
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={iterations}
                  onChange={(e) =>
                    setIterations(Math.max(1, Number(e.target.value)))
                  }
                  className="input text-xs py-1"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-2xs text-[var(--text-3)]">
                  Concurrency
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={concurrency}
                  onChange={(e) =>
                    setConcurrency(
                      Math.max(1, Math.min(50, Number(e.target.value))),
                    )
                  }
                  className="input text-xs py-1"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-2xs text-[var(--text-3)]">
                  Delay between batches (ms)
                </label>
                <input
                  type="number"
                  min={0}
                  value={delayMs}
                  onChange={(e) =>
                    setDelayMs(Math.max(0, Number(e.target.value)))
                  }
                  className="input text-xs py-1"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stopOnFailure}
                    onChange={(e) => setStopOnFailure(e.target.checked)}
                  />
                  Stop on failure
                </label>
              </div>
            </div>
          )}

          {/* Progress */}
          {batchRunning && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-2)]">Running…</span>
                <span className="text-xs text-[var(--text-3)]">
                  {progress}%
                </span>
              </div>
              <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="flex flex-col gap-3">
              {/* Summary grid */}
              <div className="grid grid-cols-3 gap-2">
                <StatCell label="Total" value={result.total} />
                <StatCell label="Passed" value={result.passed} />
                <StatCell label="Failed" value={result.failed} />
              </div>

              {/* Timing percentiles */}
              <div>
                <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
                  Latency
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <StatCell label="Min" value={`${result.minMs}ms`} />
                  <StatCell label="Mean" value={`${result.meanMs}ms`} />
                  <StatCell label="Max" value={`${result.maxMs}ms`} />
                  <StatCell label="p50" value={`${result.p50Ms}ms`} />
                  <StatCell label="p95" value={`${result.p95Ms}ms`} />
                  <StatCell label="p99" value={`${result.p99Ms}ms`} />
                </div>
              </div>

              {/* Status distribution */}
              {Object.keys(result.statusCounts).length > 0 && (
                <div>
                  <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
                    Status distribution
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.statusCounts).map(
                      ([status, count]) => (
                        <span
                          key={status}
                          className="text-2xs font-mono px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-2)]"
                        >
                          {status}: {count}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div>
                  <p className="text-2xs font-semibold text-[var(--danger)] uppercase tracking-wider mb-1">
                    Errors ({result.errors.length})
                  </p>
                  <div className="max-h-24 overflow-y-auto flex flex-col gap-1">
                    {result.errors.map((err, i) => (
                      <span
                        key={i}
                        className="text-2xs font-mono text-[var(--danger)] truncate"
                      >
                        {err}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          {batchRunning ? (
            <button
              onClick={handleCancel}
              className="btn btn-danger text-xs flex items-center gap-1.5"
            >
              <StopCircle size={13} /> Cancel
            </button>
          ) : (
            <>
              {result && (
                <button
                  onClick={() => {
                    set({ batchRunResult: null });
                    setProgress(0);
                  }}
                  className="btn text-xs"
                >
                  Reset
                </button>
              )}
              <button
                onClick={handleRun}
                disabled={!request.url.trim()}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                <Zap size={13} /> {result ? "Run again" : "Run"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
