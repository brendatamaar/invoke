import { useRef, useState } from "react";
import { CollectionRunner, type RequestRunResult, type VariableScope } from "@invoke/core";
import { useStore } from "../../../store";
import { execute } from "../../execute/api";
import { browserFetch } from "../../execute/browserFetch";
import { protocolMethod } from "../../../components/shared/methodUtils";
import { RunnerFooter } from "./runner/RunnerFooter";
import { RunnerHeader } from "./runner/RunnerHeader";
import { RunnerResults } from "./runner/RunnerResults";

export function CollectionRunnerModal() {
  const {
    showCollectionRunner,
    collectionRunnerTarget,
    collectionRunResult,
    collectionRunning,
    requests,
    environments,
    activeEnvironmentId,
    sessionVariables,
    browserMode,
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
  const runRequests = requests
    .filter((request) =>
      collectionRunnerTarget?.type === "collection"
        ? request.collectionId === collectionRunnerTarget.id && !request.folderId
        : request.folderId === collectionRunnerTarget?.id,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleRun = async () => {
    if (collectionRunning || runRequests.length === 0) return;
    set({ collectionRunning: true, collectionRunResult: null });
    setLiveResults([]);
    const runner = new CollectionRunner();
    runnerRef.current = runner;
    try {
      const result = await runner.run(
        runRequests,
        {
          execute: browserMode ? browserFetch : execute,
          scopes: buildScopes(environments, activeEnvironmentId, sessionVariables),
          stopOnFailure,
          onRequestStart: (_request, index) =>
            setLiveResults((prev) => [...prev.slice(0, index), pendingResult(runRequests[index])]),
          onRequestComplete: (result, index) =>
            setLiveResults((prev) => {
              const next = [...prev];
              next[index] = result;
              return next;
            }),
        },
        {
          id: Math.random().toString(36).slice(2),
          name: collectionRunnerTarget?.name ?? "Run",
          collectionId:
            collectionRunnerTarget?.type === "collection" ? collectionRunnerTarget.id : undefined,
          folderId:
            collectionRunnerTarget?.type === "folder" ? collectionRunnerTarget.id : undefined,
        },
      );
      set({ collectionRunResult: result });
    } catch (error) {
      addToast("error", String(error));
    } finally {
      set({ collectionRunning: false });
      runnerRef.current = null;
    }
  };

  const handleCancel = () => {
    runnerRef.current?.cancel();
    set({ collectionRunning: false });
  };
  const runAgain = () => {
    set({ collectionRunResult: null });
    setLiveResults([]);
    handleRun();
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 600, maxHeight: "80vh" }}
        onClick={(event) => event.stopPropagation()}
      >
        <RunnerHeader
          name={collectionRunnerTarget?.name ?? ""}
          count={runRequests.length}
          running={collectionRunning}
          onClose={close}
        />
        {!collectionRunning && !collectionRunResult && (
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[var(--border)]">
            <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer">
              <input
                type="checkbox"
                checked={stopOnFailure}
                onChange={(event) => setStopOnFailure(event.target.checked)}
              />
              Stop on failure
            </label>
          </div>
        )}
        <RunnerResults
          runRequests={runRequests}
          displayResults={collectionRunResult?.results ?? liveResults}
          running={collectionRunning}
        />
        <RunnerFooter
          runResult={collectionRunResult}
          running={collectionRunning}
          canRun={runRequests.length > 0}
          onCancel={handleCancel}
          onRun={handleRun}
          onRunAgain={runAgain}
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

function pendingResult(request: any): RequestRunResult {
  return {
    requestId: request.id,
    name: request.name,
    method: protocolMethod(request.protocol, (request.request as { method?: string })?.method),
    url: (request.request as { url?: string })?.url ?? "",
    status: "skipped",
    durationMs: 0,
  };
}
