import { Plus } from "lucide-react";
import type { FlowStep } from "@invoke/core";
import { FLOW_STEP_TYPES, STEP_COLORS } from "../../flowStepUtils";

export function AddStepControls({
  adding,
  onAddingChange,
  onAddStep,
}: {
  adding: boolean;
  onAddingChange: (value: boolean) => void;
  onAddStep: (type: FlowStep["type"]) => void;
}) {
  if (!adding) {
    return (
      <button
        onClick={() => onAddingChange(true)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] bg-[var(--surface)] border border-[var(--border)] rounded px-2.5 py-1.5 shadow-sm"
      >
        <Plus size={12} /> Add step
      </button>
    );
  }
  return (
    <div className="flex gap-1">
      {FLOW_STEP_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => {
            onAddStep(type);
            onAddingChange(false);
          }}
          className="flex items-center gap-1 text-2xs px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)]"
        >
          <div className={`w-1.5 h-1.5 rounded-full ${STEP_COLORS[type]}`} />
          {type}
        </button>
      ))}
      <button
        onClick={() => onAddingChange(false)}
        className="text-2xs px-2 py-1 text-[var(--text-3)]"
      >
        x
      </button>
    </div>
  );
}
