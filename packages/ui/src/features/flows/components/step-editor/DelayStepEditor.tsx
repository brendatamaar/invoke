import type { FlowStep } from "@invoke/core";

export function DelayStepEditor({
  step,
  onChange,
}: {
  step: Extract<FlowStep, { type: "delay" }>;
  onChange: (step: FlowStep) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--text-2)]">Duration</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="input text-sm py-1.5 w-32"
          min={0}
          value={step.delayMs}
          onChange={(event) =>
            onChange({ ...step, delayMs: Number(event.target.value) })
          }
        />
        <span className="text-sm text-[var(--text-3)]">ms</span>
      </div>
    </div>
  );
}
