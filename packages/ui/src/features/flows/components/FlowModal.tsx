import { useReducer, useRef } from "react";
import {
  FlowRunner,
  validateFlow,
  type Flow,
  type FlowStep,
  type VariableScope,
} from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { execute } from "../../execute/api";
import { showFlowValidation } from "../utils/validation";
import { FlowModalBody } from "./flow-modal/FlowModalBody";
import { FlowModalFooter } from "./flow-modal/FlowModalFooter";
import { FlowModalHeader } from "./flow-modal/FlowModalHeader";
import { FlowRunLog } from "./FlowRunLog";
import { makeStep } from "../flowStepUtils";

type FlowModalState = {
  draft: Flow;
  selectedIndex: number | null;
  addingStep: boolean;
  dragOver: number | null;
  viewMode: "list" | "canvas";
};

type FlowModalAction =
  | { type: "SET_DRAFT"; draft: Flow }
  | { type: "SET_SELECTED_INDEX"; index: number | null }
  | { type: "SET_ADDING_STEP"; adding: boolean }
  | { type: "SET_DRAG_OVER"; index: number | null }
  | { type: "SET_VIEW_MODE"; mode: "list" | "canvas" };

function flowModalReducer(state: FlowModalState, action: FlowModalAction): FlowModalState {
  switch (action.type) {
    case "SET_DRAFT":
      return { ...state, draft: action.draft };
    case "SET_SELECTED_INDEX":
      return { ...state, selectedIndex: action.index };
    case "SET_ADDING_STEP":
      return { ...state, addingStep: action.adding };
    case "SET_DRAG_OVER":
      return { ...state, dragOver: action.index };
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.mode };
  }
}

export function FlowModal({ flow, onClose }: { flow: Flow; onClose: () => void }) {
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

  const [state, dispatch] = useReducer(flowModalReducer, {
    draft: { ...flow, steps: flow.steps ?? [] },
    selectedIndex: null,
    addingStep: false,
    dragOver: null,
    viewMode: "list",
  });
  const { draft, selectedIndex, addingStep, dragOver, viewMode } = state;
  const setDraft = (d: Flow) => dispatch({ type: "SET_DRAFT", draft: d });
  const setSelectedIndex = (index: number | null) =>
    dispatch({ type: "SET_SELECTED_INDEX", index });
  const setAddingStep = (adding: boolean) => dispatch({ type: "SET_ADDING_STEP", adding });
  const setDragOver = (index: number | null) => dispatch({ type: "SET_DRAG_OVER", index });
  const setViewMode = (mode: "list" | "canvas") => dispatch({ type: "SET_VIEW_MODE", mode });
  const dragIndex = useRef<number | null>(null);

  const updateStep = (index: number, step: FlowStep) => {
    const steps = [...draft.steps];
    steps[index] = step;
    setDraft({ ...draft, steps });
  };

  const removeStep = (index: number) => {
    setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) });
    const prev = selectedIndex;
    if (prev !== null) {
      if (prev === index) setSelectedIndex(null);
      else setSelectedIndex(prev > index ? prev - 1 : prev);
    }
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

  const saveFlow = async () => {
    if (!showFlowValidation(validateFlow(draft), addToast)) return;
    try {
      await coreStore.saveFlow(draft);
      addToast("success", "Flow saved");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const runFlow = async () => {
    if (!showFlowValidation(validateFlow(draft, { requireSteps: true }), addToast)) return;
    set({ flowRunning: true, flowResult: undefined, flowLog: [] });
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const scopes: VariableScope[] = [];
    if (env?.variables?.length) scopes.push({ name: "environment", variables: env.variables });
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

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col overflow-hidden"
        style={{ width: viewMode === "canvas" ? "90vw" : 720, height: "82vh" }}
      >
        <FlowModalHeader
          name={draft.name}
          viewMode={viewMode}
          onNameChange={(name) => setDraft({ ...draft, name })}
          onViewModeChange={setViewMode}
          onClose={handleClose}
        />

        <FlowModalBody
          viewMode={viewMode}
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
          onUpdateStep={updateStep}
          onRemoveStep={removeStep}
        />

        <FlowRunLog flowLog={flowLog} flowResult={flowResult} />

        <FlowModalFooter
          running={flowRunning}
          onClose={handleClose}
          onSave={saveFlow}
          onRun={runFlow}
          onStop={stopFlow}
        />
      </div>
    </div>
  );
}
