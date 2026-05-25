import { Trash2 } from "lucide-react";
import type { FlowStep } from "@invoke/core";
import { STEP_LABEL_COLORS } from "../flowStepUtils";
import { ConditionalStepEditor } from "./step-editor/ConditionalStepEditor";
import { DelayStepEditor } from "./step-editor/DelayStepEditor";
import { LoopStepEditor } from "./step-editor/LoopStepEditor";
import { RequestStepEditor } from "./step-editor/RequestStepEditor";

export function StepEditorPanel({
  step,
  onChange,
  onRemove,
}: {
  step: FlowStep;
  onChange: (step: FlowStep) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span
          className={`text-2xs font-semibold uppercase tracking-wider px-2 py-1 rounded ${STEP_LABEL_COLORS[step.type]}`}
        >
          {step.type}
        </span>
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-xs text-[var(--text-3)] hover:text-[var(--danger)]"
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--text-2)]">Name</label>
        <input
          className="input text-sm py-1.5 w-full"
          placeholder="Step name"
          value={step.name}
          onChange={(event) => onChange({ ...step, name: event.target.value })}
        />
      </div>
      {step.type === "request" && (
        <RequestStepEditor step={step} onChange={onChange} />
      )}
      {step.type === "delay" && (
        <DelayStepEditor step={step} onChange={onChange} />
      )}
      {step.type === "condition" && (
        <ConditionalStepEditor step={step} onChange={onChange} />
      )}
      {step.type === "loop" && <LoopStepEditor step={step} onChange={onChange} />}
    </div>
  );
}
