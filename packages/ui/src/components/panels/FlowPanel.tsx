import { useRef, useState } from "react";
import { Play, Square, Plus, Trash2 } from "lucide-react";
import { useStore, coreStore } from "../../store";
import { FlowRunner, type Flow, type VariableScope } from "@invoke/core";
import { execute } from "../../lib/api";
import { ConfirmModal } from "../shared/ConfirmModal";

export function FlowPanel() {
  const { flows, flowDraft, flowResult, flowRunning, flowLog, set, addToast, environments, activeEnvironmentId, sessionVariables } = useStore();
  const runner = useRef(new FlowRunner());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectFlow = (flow: Flow) => set({ flowDraft: { ...flow } });

  const newFlow = () => set({ flowDraft: { id: "", name: "New Flow", steps: [] } as unknown as Flow });

  const saveFlow = async () => {
    try {
      await coreStore.saveFlow(flowDraft);
      const fs = await coreStore.listFlows();
      set({ flows: fs });
      addToast("success", "Flow saved");
    } catch (e) { addToast("error", String(e)); }
  };

  const deleteFlow = async (id: string) => {
    try {
      await coreStore.deleteFlow(id);
      const fs = await coreStore.listFlows();
      set({ flows: fs, flowDraft: { id: "", name: "New Flow", steps: [] } as unknown as Flow });
    } catch (e) { addToast("error", String(e)); }
  };

  const runFlow = async () => {
    if (!flowDraft.steps?.length) { addToast("warn", "Flow has no steps"); return; }
    set({ flowRunning: true, flowResult: undefined, flowLog: [] });
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const scopes: VariableScope[] = [];
    if (env?.variables?.length) scopes.push({ name: "environment", variables: env.variables });
    if (Object.keys(sessionVariables).length) scopes.push({ name: "session", variables: sessionVariables });
    try {
      const result = await runner.current.run(flowDraft, {
        execute,
        scopes,
        hooks: {
          onStepStart: (step) => set((s) => ({ flowLog: [...s.flowLog, `▶ ${step.name ?? step.id}`] })),
          onStepComplete: (res) => set((s) => ({ flowLog: [...s.flowLog, `${res.status === "passed" ? "✓" : "✗"} ${res.name ?? res.stepId}`] }))
        }
      });
      set({ flowResult: result });
    } catch (e) { addToast("error", String(e)); }
    finally { set({ flowRunning: false }); }
  };

  const stopFlow = () => { runner.current.cancel(); set({ flowRunning: false }); };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">Flows</span>
        <button onClick={newFlow} className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"><Plus size={13} /></button>
      </div>

      {/* Flow list */}
      <div className="border-b border-[var(--border)] max-h-40 overflow-y-auto">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className={`group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--surface-2)] ${flowDraft.id === flow.id ? "bg-[var(--accent-subtle)]" : ""}`}
            onClick={() => selectFlow(flow)}
          >
            <span className="flex-1 text-xs text-[var(--text-1)] truncate">{flow.name}</span>
            <span className="text-2xs text-[var(--text-3)]">{flow.steps?.length ?? 0} steps</span>
            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(flow.id); }} className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)]">
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        {!flows.length && <p className="p-3 text-xs text-[var(--text-3)] text-center">No flows</p>}
      </div>

      {/* Draft editor */}
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center gap-2">
        <input
          value={flowDraft.name}
          onChange={(e) => set({ flowDraft: { ...flowDraft, name: e.target.value } })}
          className="input text-xs py-1 flex-1"
          placeholder="Flow name"
        />
        <button onClick={saveFlow} className="btn text-2xs py-0.5 px-2">Save</button>
        {flowRunning
          ? <button onClick={stopFlow} className="btn btn-danger text-2xs py-0.5 px-2"><Square size={11} /> Stop</button>
          : <button onClick={runFlow} className="btn btn-primary text-2xs py-0.5 px-2"><Play size={11} /> Run</button>
        }
      </div>

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Delete Flow"
        message="Delete this flow?"
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (confirmDeleteId) deleteFlow(confirmDeleteId); setConfirmDeleteId(null); }}
        onClose={() => setConfirmDeleteId(null)}
      />

      {/* Log */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-2xs flex flex-col gap-0.5">
        {flowLog.map((line, i) => (
          <span key={i} className={`${line.startsWith("✓") ? "text-emerald-600" : line.startsWith("✗") ? "text-red-600" : "text-[var(--text-2)]"}`}>{line}</span>
        ))}
        {flowResult && (
          <div className={`mt-2 p-2 rounded text-xs ${flowResult.status === "passed" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            Flow {flowResult.status} in {flowResult.completedAt - flowResult.startedAt}ms
          </div>
        )}
      </div>
    </div>
  );
}
