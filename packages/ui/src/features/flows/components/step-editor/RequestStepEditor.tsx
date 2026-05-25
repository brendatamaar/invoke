import type { FlowStep } from "@invoke/core";
import { Select } from "../../../../components/shared/Select";
import { HTTP_METHODS } from "../../flowStepUtils";

export function RequestStepEditor({
  step,
  onChange,
}: {
  step: Extract<FlowStep, { type: "request" }>;
  onChange: (step: FlowStep) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--text-2)]">Request</label>
        <div className="flex gap-2">
          <Select
            value={step.request.method}
            onChange={(value) =>
              onChange({
                ...step,
                request: { ...step.request, method: value as any },
              })
            }
            size="xs"
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </Select>
          <input
            className="input text-sm py-1.5 flex-1"
            placeholder="https://..."
            value={step.request.url}
            onChange={(event) =>
              onChange({
                ...step,
                request: { ...step.request, url: event.target.value },
              })
            }
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--text-2)] cursor-pointer">
        <input
          type="checkbox"
          checked={step.continueOnFailure ?? false}
          onChange={(event) =>
            onChange({ ...step, continueOnFailure: event.target.checked })
          }
        />
        Continue on failure
      </label>
    </>
  );
}
