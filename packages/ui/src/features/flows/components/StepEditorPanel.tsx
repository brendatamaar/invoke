import { Trash2 } from "lucide-react";
import type { FlowStep } from "@invoke/core";
import { Select } from "../../../components/shared/Select";
import {
  HTTP_METHODS,
  STEP_LABEL_COLORS,
} from "./flowStepUtils";

export function StepEditorPanel({
  step,
  onChange,
  onRemove,
}: {
  step: FlowStep;
  onChange: (s: FlowStep) => void;
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
          onChange={(e) => onChange({ ...step, name: e.target.value })}
        />
      </div>

      {step.type === "request" && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-2)]">
              Request
            </label>
            <div className="flex gap-2">
              <Select
                value={step.request.method}
                onChange={(v) =>
                  onChange({
                    ...step,
                    request: { ...step.request, method: v as any },
                  })
                }
                size="xs"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
              <input
                className="input text-sm py-1.5 flex-1"
                placeholder="https://..."
                value={step.request.url}
                onChange={(e) =>
                  onChange({
                    ...step,
                    request: { ...step.request, url: e.target.value },
                  })
                }
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-2)] cursor-pointer">
            <input
              type="checkbox"
              checked={step.continueOnFailure ?? false}
              onChange={(e) =>
                onChange({ ...step, continueOnFailure: e.target.checked })
              }
            />
            Continue on failure
          </label>
        </>
      )}

      {step.type === "delay" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-2)]">
            Duration
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="input text-sm py-1.5 w-32"
              min={0}
              value={step.delayMs}
              onChange={(e) =>
                onChange({ ...step, delayMs: Number(e.target.value) })
              }
            />
            <span className="text-sm text-[var(--text-3)]">ms</span>
          </div>
        </div>
      )}

      {step.type === "condition" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-2)]">
              Source
            </label>
            <div className="flex gap-2">
              <Select
                value={step.condition.source}
                onChange={(v) =>
                  onChange({
                    ...step,
                    condition: { ...step.condition, source: v as any },
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
                className="input text-sm py-1.5 flex-1"
                placeholder="Expression"
                value={step.condition.expression}
                onChange={(e) =>
                  onChange({
                    ...step,
                    condition: {
                      ...step.condition,
                      expression: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-2)]">
              Matcher
            </label>
            <div className="flex gap-2">
              <Select
                value={step.condition.matcher}
                onChange={(v) =>
                  onChange({
                    ...step,
                    condition: { ...step.condition, matcher: v as any },
                  })
                }
                size="xs"
              >
                {[
                  "equals",
                  "notEquals",
                  "exists",
                  "gt",
                  "lt",
                  "contains",
                  "matches",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
              <input
                className="input text-sm py-1.5 flex-1"
                placeholder="Expected value"
                value={step.condition.expected}
                onChange={(e) =>
                  onChange({
                    ...step,
                    condition: { ...step.condition, expected: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {step.type === "loop" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-2)]">
              Count
            </label>
            <input
              type="number"
              className="input text-sm py-1.5 w-32"
              min={1}
              placeholder="unlimited"
              value={step.count ?? ""}
              onChange={(e) =>
                onChange({
                  ...step,
                  count: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-2)]">
              Max iterations
            </label>
            <input
              type="number"
              className="input text-sm py-1.5 w-32"
              min={1}
              placeholder="100"
              value={step.maxIterations ?? ""}
              onChange={(e) =>
                onChange({
                  ...step,
                  maxIterations: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
