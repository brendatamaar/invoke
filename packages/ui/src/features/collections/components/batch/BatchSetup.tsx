export function BatchSetup({
  iterations,
  concurrency,
  delayMs,
  stopOnFailure,
  onIterationsChange,
  onConcurrencyChange,
  onDelayChange,
  onStopOnFailureChange,
}: {
  iterations: number;
  concurrency: number;
  delayMs: number;
  stopOnFailure: boolean;
  onIterationsChange: (value: number) => void;
  onConcurrencyChange: (value: number) => void;
  onDelayChange: (value: number) => void;
  onStopOnFailureChange: (value: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumberField
        id="batch-iterations"
        label="Iterations"
        value={iterations}
        min={1}
        max={10000}
        onChange={(value) => onIterationsChange(Math.max(1, value))}
      />
      <NumberField
        id="batch-concurrency"
        label="Concurrency"
        value={concurrency}
        min={1}
        max={50}
        onChange={(value) => onConcurrencyChange(Math.max(1, Math.min(50, value)))}
      />
      <NumberField
        id="batch-delay"
        label="Delay between batches (ms)"
        value={delayMs}
        min={0}
        onChange={(value) => onDelayChange(Math.max(0, value))}
      />
      <div className="flex items-center gap-2 pt-4">
        <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer">
          <input
            type="checkbox"
            checked={stopOnFailure}
            onChange={(event) => onStopOnFailureChange(event.target.checked)}
          />
          Stop on failure
        </label>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  id,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
  id?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-2xs text-[var(--text-3)]">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="input text-xs py-1"
      />
    </div>
  );
}
