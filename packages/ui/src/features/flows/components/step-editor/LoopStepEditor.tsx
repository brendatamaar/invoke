import type { FlowStep } from "@invoke/core";

export function LoopStepEditor({
  step,
  onChange,
}: {
  step: Extract<FlowStep, { type: "loop" }>;
  onChange: (step: FlowStep) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <NumberField
        label="Count"
        value={step.count}
        placeholder="unlimited"
        onChange={(count) => onChange({ ...step, count })}
      />
      <NumberField
        label="Max iterations"
        value={step.maxIterations}
        placeholder="100"
        onChange={(maxIterations) => onChange({ ...step, maxIterations })}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value?: number;
  placeholder: string;
  onChange: (value?: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--text-2)]">{label}</label>
      <input
        type="number"
        className="input text-sm py-1.5 w-32"
        min={1}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value ? Number(event.target.value) : undefined)
        }
      />
    </div>
  );
}
