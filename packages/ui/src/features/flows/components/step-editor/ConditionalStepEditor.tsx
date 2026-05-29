import type { FlowStep } from "@invoke/core";
import { Select } from "../../../../components/shared/Select";

export function ConditionalStepEditor({
  step,
  onChange,
}: {
  step: Extract<FlowStep, { type: "condition" }>;
  onChange: (step: FlowStep) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="condition-expression" className="text-xs font-medium text-[var(--text-2)]">Source</label>
        <div className="flex gap-2">
          <Select
            value={step.condition.source}
            onChange={(value) =>
              onChange({
                ...step,
                condition: { ...step.condition, source: value as any },
              })
            }
            size="xs"
          >
            <option value="status">Status</option>
            <option value="variable">Variable</option>
            <option value="bodyJsonPath">JSON Path</option>
            <option value="header">Header</option>
          </Select>
          <input
            id="condition-expression"
            aria-label="Condition expression"
            className="input text-sm py-1.5 flex-1"
            placeholder="Expression"
            value={step.condition.expression}
            onChange={(event) =>
              onChange({
                ...step,
                condition: { ...step.condition, expression: event.target.value },
              })
            }
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="condition-expected" className="text-xs font-medium text-[var(--text-2)]">Matcher</label>
        <div className="flex gap-2">
          <Select
            value={step.condition.matcher}
            onChange={(value) =>
              onChange({
                ...step,
                condition: { ...step.condition, matcher: value as any },
              })
            }
            size="xs"
          >
            {["equals", "notEquals", "exists", "gt", "lt", "contains", "matches"].map((matcher) => (
              <option key={matcher} value={matcher}>
                {matcher}
              </option>
            ))}
          </Select>
          <input
            id="condition-expected"
            aria-label="Expected value"
            className="input text-sm py-1.5 flex-1"
            placeholder="Expected value"
            value={step.condition.expected}
            onChange={(event) =>
              onChange({
                ...step,
                condition: { ...step.condition, expected: event.target.value },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
