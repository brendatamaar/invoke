import { useState } from "react";
import { X, ArrowLeftRight, MinusCircle, Plus } from "lucide-react";
import { compareResponses } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { StatusBadge } from "../../../components/shared/StatusBadge";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { Select } from "../../../components/shared/Select";

export function DiffModal() {
  const { showDiffModal, history, diffIgnoreRules, diffLeftId, diffRightId, set, addToast } = useStore();
  const [leftId, setLeftId] = useState(diffLeftId ?? "");
  const [rightId, setRightId] = useState(diffRightId ?? "");
  const [newPath, setNewPath] = useState("");

  if (!showDiffModal) return null;

  const close = () => set({ showDiffModal: false });

  const leftEntry = history.find((h) => h.id === leftId);
  const rightEntry = history.find((h) => h.id === rightId);
  const ignorePaths = diffIgnoreRules.map((r) => r.path);
  const diff =
    leftEntry?.response && rightEntry?.response
      ? compareResponses(leftEntry.response, rightEntry.response, {
          ignorePaths,
        })
      : null;

  const entryLabel = (h: (typeof history)[number]) => {
    const req = h.request as { method?: string; url?: string } | undefined;
    return `${req?.method ?? "GET"} ${(req?.url ?? "—").slice(0, 60)}`;
  };

  const addIgnorePath = async (path: string) => {
    const trimmed = path.trim();
    if (!trimmed || diffIgnoreRules.some((r) => r.path === trimmed)) return;
    const updated = [
      ...diffIgnoreRules,
      { id: Math.random().toString(36).slice(2), path: trimmed },
    ];
    try {
      await coreStore.saveDiffIgnoreRules(updated);
      set({ diffIgnoreRules: updated });
    } catch (e) {
      addToast("error", String(e));
    }
    setNewPath("");
  };

  const removeIgnorePath = async (id: string) => {
    const updated = diffIgnoreRules.filter((r) => r.id !== id);
    try {
      await coreStore.saveDiffIgnoreRules(updated);
      set({ diffIgnoreRules: updated });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col"
        style={{ width: "90vw", maxHeight: "100vh", minHeight: "50vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <ArrowLeftRight size={15} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">Compare Responses</span>
          <button
            onClick={close}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex gap-3 px-4 py-3 border-b border-[var(--border)]">
          <div className="flex-1">
            <label className="text-2xs text-[var(--text-3)] block mb-1">
              Left (baseline)
            </label>
            <Select value={leftId} onChange={(e) => setLeftId(e.target.value)}>
              <option value="">Select response…</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {entryLabel(h)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-2xs text-[var(--text-3)] block mb-1">
              Right (comparison)
            </label>
            <Select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
            >
              <option value="">Select response…</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {entryLabel(h)}
                </option>
              ))}
            </Select>
          </div>

          {/* Ignore rules */}
          <div className="flex-1">
            <label className="text-2xs text-[var(--text-3)] block mb-1">
              Ignore paths
            </label>
            <div className="flex flex-wrap gap-1 mb-1">
              {diffIgnoreRules.map((rule) => (
                <span
                  key={rule.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-2xs font-mono text-[var(--text-1)]"
                >
                  {rule.path}
                  <button
                    onClick={() => removeIgnorePath(rule.id)}
                    className="text-[var(--text-3)] hover:text-[var(--danger)] ml-0.5"
                  >
                    <MinusCircle size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addIgnorePath(newPath);
                }}
                placeholder="body.timestamp"
                className="input text-2xs py-0.5 flex-1 font-mono"
              />
              <button
                onClick={() => addIgnorePath(newPath)}
                className="btn text-2xs py-0.5 px-2 flex items-center gap-1"
              >
                <Plus size={10} /> Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {diff ? (
            <div className="flex flex-1 overflow-hidden flex-col">
              {/* Ignore from diff changes */}
              {diff.changes.length > 0 && (
                <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] flex flex-wrap gap-1 items-center">
                  <span className="text-2xs text-[var(--text-3)] shrink-0">
                    Changed paths:
                  </span>
                  {[...new Set(diff.changes.map((c) => c.path))]
                    .slice(0, 12)
                    .map((path) => (
                      <button
                        key={path}
                        onClick={() => addIgnorePath(path)}
                        className="text-2xs font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        title="Click to ignore this path"
                      >
                        {path}
                      </button>
                    ))}
                </div>
              )}
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 border-r border-[var(--border)] flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
                    {leftEntry?.response && (
                      <StatusBadge status={leftEntry.response.status} />
                    )}
                    <span className="text-2xs text-[var(--text-3)]">
                      Baseline
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <CodeEditor
                      value={diff.leftText}
                      lang={diff.mode === "json" ? "json" : "text"}
                      readOnly
                    />
                  </div>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
                    {rightEntry?.response && (
                      <StatusBadge status={rightEntry.response.status} />
                    )}
                    <span className="text-2xs text-[var(--text-3)]">
                      Comparison
                    </span>
                    <span className="ml-auto text-2xs flex items-center gap-2">
                      <span className="text-emerald-600">
                        +{diff.summary.additions}
                      </span>
                      <span className="text-red-600">
                        −{diff.summary.deletions}
                      </span>
                      {diff.summary.changes > 0 && (
                        <span className="text-yellow-600">
                          ~{diff.summary.changes}
                        </span>
                      )}
                      {diff.responseTimeDeltaMs !== 0 && (
                        <span
                          className={`font-mono ${diff.responseTimeDeltaMs > 0 ? "text-red-500" : "text-emerald-500"}`}
                        >
                          {diff.responseTimeDeltaMs > 0 ? "+" : ""}
                          {diff.responseTimeDeltaMs}ms
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <CodeEditor
                      value={diff.rightText}
                      lang={diff.mode === "json" ? "json" : "text"}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-3)]">
              Select two responses to compare
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
