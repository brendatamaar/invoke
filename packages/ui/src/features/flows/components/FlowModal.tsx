import { useRef, useState } from "react";
import { List, Network, Play, Square, X } from "lucide-react";
import {
  FlowRunner,
  validateFlow,
  type Flow,
  type FlowStep,
  type VariableScope,
} from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { execute } from "../../execute/api";
import { FlowCanvas } from "./FlowCanvas";
import { FlowRunLog } from "./FlowRunLog";
import { FlowStepList } from "./FlowStepList";
import { makeStep } from "./flowStepUtils";
import { StepEditorPanel } from "./StepEditorPanel";

export function FlowModal({
  flow,
  onClose,
}: {
  flow: Flow;
  onClose: () => void;
}) {
  const {
    set,
    addToast,
    environments,
    activeEnvironmentId,
    sessionVariables,
    flowRunning,
    flowLog,
    flowResult,
  } = useStore();
  const runner = useRef(new FlowRunner());

  const handleClose = () => {
    runner.current.cancel();
    set({ flowRunning: false, flowLog: [], flowResult: undefined });
    onClose();
  };
  const [draft, setDraft] = useState<Flow>({
    ...flow,
    steps: flow.steps ?? [],
  });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [addingStep, setAddingStep] = useState(false);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "canvas">("list");
  const dragIndex = useRef<number | null>(null);

  const updateStep = (index: number, step: FlowStep) => {
    const steps = [...draft.steps];
    steps[index] = step;
    setDraft({ ...draft, steps });
  };

  const removeStep = (index: number) => {
    setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) });
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  };

  const addStep = (type: FlowStep["type"]) => {
    const step = makeStep(type);
    const steps = [...draft.steps, step];
    setDraft({ ...draft, steps });
    setSelectedIndex(steps.length - 1);
    setAddingStep(false);
  };

  const reorderStep = (from: number, to: number) => {
    if (from === to) return;
    const steps = [...draft.steps];
    const [moved] = steps.splice(from, 1);
    steps.splice(to, 0, moved);
    setDraft({ ...draft, steps });
    setSelectedIndex(to);
  };

  const showValidation = (validation: ReturnType<typeof validateFlow>) => {
    if (!validation.valid) {
      const [firstError] = validation.errors;
      const remaining = validation.errors.length - 1;
      addToast(
        "error",
        `${firstError.message}${remaining > 0 ? ` (+${remaining} more)` : ""}`,
      );
      return false;
    }
    if (validation.warnings.length > 0) {
      const [firstWarning] = validation.warnings;
      const remaining = validation.warnings.length - 1;
      addToast(
        "warn",
        `${firstWarning.message}${remaining > 0 ? ` (+${remaining} more)` : ""}`,
      );
    }
    return true;
  };

  const saveFlow = async () => {
    if (!showValidation(validateFlow(draft))) return;
    try {
      await coreStore.saveFlow(draft);
      const fs = await coreStore.listFlows();
      set({ flows: fs });
      addToast("success", "Flow saved");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const runFlow = async () => {
    if (!showValidation(validateFlow(draft, { requireSteps: true }))) return;
    set({ flowRunning: true, flowResult: undefined, flowLog: [] });
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const scopes: VariableScope[] = [];
    if (env?.variables?.length)
      scopes.push({ name: "environment", variables: env.variables });
    if (Object.keys(sessionVariables).length)
      scopes.push({ name: "session", variables: sessionVariables });
    try {
      const result = await runner.current.run(draft, {
        execute,
        scopes,
        hooks: {
          onStepStart: (step) =>
            set((s) => ({
              flowLog: [...s.flowLog, `RUN ${step.name ?? step.id}`],
            })),
          onStepComplete: (res) =>
            set((s) => ({
              flowLog: [
                ...s.flowLog,
                `${res.status === "passed" ? "OK" : "ERR"} ${res.name ?? res.stepId}`,
              ],
            })),
        },
      });
      set({ flowResult: result });
    } catch (e) {
      addToast("error", String(e));
    } finally {
      set({ flowRunning: false });
    }
  };

  const stopFlow = () => {
    runner.current.cancel();
    set({ flowRunning: false });
  };

  const selectedStep =
    selectedIndex !== null ? draft.steps[selectedIndex] : null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: viewMode === "canvas" ? "90vw" : 720, height: "82vh" }}
      >
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] shrink-0">
          <input
            className="input text-sm py-1 flex-1 font-medium"
            placeholder="Flow name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="flex rounded border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-2 py-1 text-2xs flex items-center gap-1 ${viewMode === "list" ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:bg-[var(--surface-2)]"}`}
              title="List view"
            >
              <List size={12} /> List
            </button>
            <button
              onClick={() => setViewMode("canvas")}
              className={`px-2 py-1 text-2xs flex items-center gap-1 ${viewMode === "canvas" ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:bg-[var(--surface-2)]"}`}
              title="Canvas view"
            >
              <Network size={12} /> Canvas
            </button>
          </div>
          <button
            onClick={handleClose}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded hover:bg-[var(--surface-2)]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {viewMode === "canvas" && (
            <div className="flex flex-1 min-h-0 min-w-0">
              <div className="flex-1 min-w-0 overflow-hidden">
                <FlowCanvas
                  steps={draft.steps}
                  selectedIndex={selectedIndex}
                  flowResult={flowResult}
                  onSelect={setSelectedIndex}
                  onAddStep={addStep}
                />
              </div>
              {selectedIndex !== null && draft.steps[selectedIndex] && (
                <div
                  className="border-l border-[var(--border)] overflow-y-auto p-5 shrink-0"
                  style={{ width: 280 }}
                >
                  <StepEditorPanel
                    step={draft.steps[selectedIndex]}
                    onChange={(s) => updateStep(selectedIndex, s)}
                    onRemove={() => removeStep(selectedIndex)}
                  />
                </div>
              )}
            </div>
          )}

          {viewMode === "list" && (
            <>
              <FlowStepList
                steps={draft.steps}
                selectedIndex={selectedIndex}
                flowResult={flowResult}
                addingStep={addingStep}
                dragOver={dragOver}
                dragIndex={dragIndex}
                onSelect={setSelectedIndex}
                onAddStep={addStep}
                onSetAddingStep={setAddingStep}
                onSetDragOver={setDragOver}
                onReorderStep={reorderStep}
                onRemoveStep={removeStep}
              />

              <div className="flex-1 overflow-y-auto p-6">
                {selectedStep ? (
                  <StepEditorPanel
                    step={selectedStep}
                    onChange={(s) => updateStep(selectedIndex!, s)}
                    onRemove={() => removeStep(selectedIndex!)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-1 text-[var(--text-3)]">
                    <p className="text-sm">
                      Select a step to edit or add a new step
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <FlowRunLog flowLog={flowLog} flowResult={flowResult} />

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-2)] shrink-0">
          <button onClick={handleClose} className="btn text-xs">
            Close
          </button>
          <button onClick={saveFlow} className="btn text-xs">
            Save
          </button>
          {flowRunning ? (
            <button
              onClick={stopFlow}
              className="btn btn-danger text-xs flex items-center gap-1.5"
            >
              <Square size={12} />
              Stop
            </button>
          ) : (
            <button
              onClick={runFlow}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <Play size={12} />
              Run
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
