import { useState } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import { compareResponses } from "@invoke/core";
import { useStore } from "../../store";
import { StatusBadge } from "../shared/StatusBadge";
import { CodeEditor } from "../editors/CodeEditor";

export function DiffModal() {
  const { showDiffModal, history, set } = useStore();
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  if (!showDiffModal) return null;

  const close = () => set({ showDiffModal: false });

  const leftEntry = history.find((h) => h.id === leftId);
  const rightEntry = history.find((h) => h.id === rightId);
  const diff = leftEntry?.response && rightEntry?.response
    ? compareResponses(leftEntry.response, rightEntry.response)
    : null;

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const entryLabel = (h: (typeof history)[number]) => {
    const req = h.request as { method?: string; url?: string } | undefined;
    return `${req?.method ?? "GET"} ${(req?.url ?? "—").slice(0, 60)} (${fmt(h.createdAt)})`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={close}>
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col"
        style={{ width: "90vw", maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <ArrowLeftRight size={15} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">Compare Responses</span>
          <button onClick={close} className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]">
            <X size={15} />
          </button>
        </div>

        <div className="flex gap-3 px-4 py-3 border-b border-[var(--border)]">
          <div className="flex-1">
            <label className="text-2xs text-[var(--text-3)] block mb-1">Left (baseline)</label>
            <select value={leftId} onChange={(e) => setLeftId(e.target.value)} className="input text-xs py-1 w-full">
              <option value="">Select response…</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>{entryLabel(h)}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-2xs text-[var(--text-3)] block mb-1">Right (comparison)</label>
            <select value={rightId} onChange={(e) => setRightId(e.target.value)} className="input text-xs py-1 w-full">
              <option value="">Select response…</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>{entryLabel(h)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {diff ? (
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 border-r border-[var(--border)] flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
                  {leftEntry?.response && <StatusBadge status={leftEntry.response.status} />}
                  <span className="text-2xs text-[var(--text-3)]">Baseline</span>
                </div>
                <div className="flex-1 overflow-auto">
                  <CodeEditor value={diff.leftText} lang={diff.mode === "json" ? "json" : "text"} readOnly />
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
                  {rightEntry?.response && <StatusBadge status={rightEntry.response.status} />}
                  <span className="text-2xs text-[var(--text-3)]">Comparison</span>
                  <span className="ml-auto text-2xs flex items-center gap-2">
                    <span className="text-emerald-600">+{diff.summary.additions}</span>
                    <span className="text-red-600">−{diff.summary.deletions}</span>
                    {diff.summary.changes > 0 && <span className="text-yellow-600">~{diff.summary.changes}</span>}
                    {diff.responseTimeDeltaMs !== 0 && (
                      <span className={`font-mono ${diff.responseTimeDeltaMs > 0 ? "text-red-500" : "text-emerald-500"}`}>
                        {diff.responseTimeDeltaMs > 0 ? "+" : ""}{diff.responseTimeDeltaMs}ms
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  <CodeEditor value={diff.rightText} lang={diff.mode === "json" ? "json" : "text"} readOnly />
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
