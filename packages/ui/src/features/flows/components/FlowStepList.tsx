import type { MutableRefObject } from "react";
import { CheckCircle2, Clock, GripVertical, Plus, Trash2, XCircle } from "lucide-react";
import type { FlowResult, FlowStep, FlowStepResult } from "@invoke/core";
import { FLOW_STEP_TYPES, STEP_COLORS } from "../flowStepUtils";

export function FlowStepList({
  steps,
  selectedIndex,
  flowResult,
  addingStep,
  dragOver,
  dragIndex,
  onSelect,
  onAddStep,
  onSetAddingStep,
  onSetDragOver,
  onReorderStep,
  onRemoveStep,
}: {
  steps: FlowStep[];
  selectedIndex: number | null;
  flowResult: FlowResult | undefined;
  addingStep: boolean;
  dragOver: number | null;
  dragIndex: MutableRefObject<number | null>;
  onSelect: (index: number) => void;
  onAddStep: (type: FlowStep["type"]) => void;
  onSetAddingStep: (adding: boolean) => void;
  onSetDragOver: (index: number | null) => void;
  onReorderStep: (from: number, to: number) => void;
  onRemoveStep: (index: number) => void;
}) {
  return (
    <div className="flex flex-col border-r border-[var(--border)]" style={{ width: 220 }}>
      <div className="px-4 py-2.5 border-b border-[var(--border)] shrink-0">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Steps {steps.length > 0 && `- ${steps.length}`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col">
        {steps.map((step, i) => {
          const stepResult = flowResult?.steps.find((r: FlowStepResult) => r.stepId === step.id);
          const isDragTarget = dragOver === i;
          return (
            <div
              key={step.id}
              className="relative flex flex-col"
              draggable
              onDragStart={() => {
                dragIndex.current = i;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                onSetDragOver(i);
              }}
              onDragLeave={() => onSetDragOver(null)}
              onDrop={() => {
                if (dragIndex.current !== null) onReorderStep(dragIndex.current, i);
                dragIndex.current = null;
                onSetDragOver(null);
              }}
            >
              {isDragTarget && <div className="h-0.5 bg-[var(--accent)] rounded mx-1 mb-1" />}
              <div
                className={`relative group flex items-start gap-1.5 px-2 py-2 rounded hover:bg-[var(--surface-2)] ${selectedIndex === i ? "bg-[var(--accent-subtle)]" : ""}`}
              >
                <button type="button" className="absolute inset-0" onClick={() => onSelect(i)} aria-label={`Select step ${step.name}`} />
                <GripVertical
                  size={11}
                  className="text-[var(--text-3)] opacity-0 group-hover:opacity-100 shrink-0 mt-1 cursor-grab"
                />
                <div className="relative flex flex-col items-center shrink-0 mt-1">
                  <div className={`w-2 h-2 rounded-full ${STEP_COLORS[step.type]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xs text-[var(--text-3)] uppercase tracking-wide">
                    {step.type}
                  </div>
                  <div className="text-xs text-[var(--text-1)] truncate font-medium">
                    {step.name}
                  </div>
                  {step.type === "request" && (
                    <div className="text-2xs text-[var(--text-3)] truncate">
                      {step.request.method} {step.request.url || "-"}
                    </div>
                  )}
                  {step.type === "delay" && (
                    <div className="text-2xs text-[var(--text-3)]">{step.delayMs}ms</div>
                  )}
                  {stepResult && (
                    <div
                      className={`flex items-center gap-1 text-2xs mt-0.5 ${stepResult.status === "passed" ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
                    >
                      {stepResult.status === "passed" ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <XCircle size={10} />
                      )}
                      <span className="flex items-center gap-0.5 text-[var(--text-3)]">
                        <Clock size={9} />
                        {stepResult.completedAt - stepResult.startedAt}ms
                      </span>
                      {stepResult.response?.status != null && <span>{stepResult.response.status === 0 ? "ERR" : stepResult.response.status}</span>}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveStep(i)}
                  className="relative opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0 mt-0.5"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              {i < steps.length - 1 && (
                <div className="w-px bg-[var(--border)] self-start ml-[22px] h-2" />
              )}
            </div>
          );
        })}

        {!steps.length && (
          <p className="text-xs text-[var(--text-3)] text-center py-6">No steps yet</p>
        )}
      </div>

      <div className="p-3 border-t border-[var(--border)] shrink-0">
        {addingStep ? (
          <div className="flex flex-col gap-0.5">
            {FLOW_STEP_TYPES.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => onAddStep(t)}
                className="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-1)] text-left"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STEP_COLORS[t]}`} />
                {t}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onSetAddingStep(false)}
              className="text-2xs text-[var(--text-3)] hover:text-[var(--text-1)] px-2 py-1 text-left mt-0.5"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onSetAddingStep(true)}
            className="flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] w-full"
          >
            <Plus size={12} /> Add step
          </button>
        )}
      </div>
    </div>
  );
}
