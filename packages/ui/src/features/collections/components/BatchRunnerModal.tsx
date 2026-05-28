import { useRef, useState } from "react";
import { X, Zap } from "lucide-react";
import { BatchRunner, resolveRequest, type VariableScope } from "@invoke/core";
import { useStore } from "../../../store";
import { execute } from "../../execute";
import { BatchFooter } from "./batch/BatchFooter";
import { BatchProgress } from "./batch/BatchProgress";
import { BatchResults } from "./batch/BatchResults";
import { BatchSetup } from "./batch/BatchSetup";

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
    const runner = new BatchRunner();
    runnerRef.current = runner;
    try {
      const { request: resolved } = resolveRequest(
        request as import("@invoke/core").RequestConfig,
        buildScopes(environments, activeEnvironmentId, sessionVariables),
      );
      const stats = await runner.run(
        resolved,
        execute,
        { iterations, concurrency, delayMs, stopOnFailure },
        (done, total) => setProgress(Math.round((done / total) * 100)),
      );
      set({ batchRunResult: stats });
    } catch (error) {
      addToast("error", String(error));
    } finally {
      set({ batchRunning: false });
      runnerRef.current = null;
    }
  };
  const handleCancel = () => {
    runnerRef.current?.cancel();
    set({ batchRunning: false });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 500, maxHeight: "80vh" }}
        onClick={(event) => event.stopPropagation()}
      >
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
          {!batchRunning && !batchRunResult && (
            <BatchSetup
              iterations={iterations}
              concurrency={concurrency}
              delayMs={delayMs}
              stopOnFailure={stopOnFailure}
              onIterationsChange={setIterations}
              onConcurrencyChange={setConcurrency}
              onDelayChange={setDelayMs}
              onStopOnFailureChange={setStopOnFailure}
            />
          )}
          {batchRunning && <BatchProgress progress={progress} />}
          {batchRunResult && <BatchResults result={batchRunResult} />}
        </div>
        <BatchFooter
          running={batchRunning}
          hasResult={!!batchRunResult}
          canRun={request.url.trim().length > 0}
          onCancel={handleCancel}
          onReset={() => {
            set({ batchRunResult: null });
            setProgress(0);
          }}
          onRun={handleRun}
        />
      </div>
    </div>
  );
}

function buildScopes(
  environments: any[],
  activeEnvironmentId: string | undefined,
  sessionVariables: Record<string, string>,
): VariableScope[] {
  const env = environments.find((item) => item.id === activeEnvironmentId);
  return [
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
}
