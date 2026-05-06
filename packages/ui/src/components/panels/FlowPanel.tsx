import { useRef, useState } from "react";
import { Play, Square, Plus, Trash2, X } from "lucide-react";
import { useStore, coreStore } from "../../store";
import {
  FlowRunner,
  validateFlow,
  type Flow,
  type FlowStep,
  type VariableScope,
} from "@invoke/core";
import { execute } from "../../lib/api";
import { ConfirmModal } from "../shared/ConfirmModal";
import { Select } from "../shared/Select";

const STEP_COLORS: Record<FlowStep["type"], string> = {
  request: "bg-blue-500",
  delay: "bg-amber-500",
  condition: "bg-violet-500",
  loop: "bg-emerald-500",
};

const STEP_LABEL_COLORS: Record<FlowStep["type"], string> = {
  request: "text-blue-600 bg-blue-50",
  delay: "text-amber-600 bg-amber-50",
  condition: "text-violet-600 bg-violet-50",
  loop: "text-emerald-600 bg-emerald-50",
};

function makeStep(type: FlowStep["type"]): FlowStep {
  const id = crypto.randomUUID();
  if (type === "request")
    return {
      id,
      type,
      name: "Request",
      request: {
        url: "",
        method: "GET",
        params: [],
        headers: [],
        bodyMode: "none",
        body: "",
        auth: { type: "none" },
        timeoutMs: 30000,
      },
      continueOnFailure: false,
    };
  if (type === "delay") return { id, type, name: "Delay", delayMs: 1000 };
  if (type === "condition")
    return {
      id,
      type,
      name: "Condition",
      condition: {
        source: "status",
        expression: "",
        matcher: "equals",
        expected: "200",
      },
      thenSteps: [],
    };
  return {
    id,
    type: "loop",
    name: "Loop",
    steps: [],
    count: 3,
    maxIterations: 100,
  };
}

function StepEditorPanel({
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
                {[
                  "GET",
                  "POST",
                  "PUT",
                  "PATCH",
                  "DELETE",
                  "HEAD",
                  "OPTIONS",
                ].map((m) => (
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
              placeholder="∞"
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

function FlowModal({ flow, onClose }: { flow: Flow; onClose: () => void }) {
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
  const [draft, setDraft] = useState<Flow>({
    ...flow,
    steps: flow.steps ?? [],
  });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [addingStep, setAddingStep] = useState(false);

  const updateStep = (index: number, step: FlowStep) => {
    const steps = [...draft.steps];
    steps[index] = step;
    setDraft({ ...draft, steps });
  };

  const removeStep = (index: number) => {
    setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) });
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  };

  const addStep = (type: FlowStep["type"]) => {
    const step = makeStep(type);
    const steps = [...draft.steps, step];
    setDraft({ ...draft, steps });
    setSelectedIndex(steps.length - 1);
    setAddingStep(false);
  };

  const showValidation = (validation: ReturnType<typeof validateFlow>) => {
    if (!validation.valid) {
      const [firstError] = validation.errors;
      const remaining = validation.errors.length - 1;
      addToast(
        "error",
        `${firstError.message}${remaining > 0 ? ` (+${remaining} more)` : ""}`,
      );
      return false;
    }
    if (validation.warnings.length > 0) {
      const [firstWarning] = validation.warnings;
      const remaining = validation.warnings.length - 1;
      addToast(
        "warn",
        `${firstWarning.message}${remaining > 0 ? ` (+${remaining} more)` : ""}`,
      );
    }
    return true;
  };

  const saveFlow = async () => {
    if (!showValidation(validateFlow(draft))) return;
    try {
      await coreStore.saveFlow(draft);
      const fs = await coreStore.listFlows();
      set({ flows: fs });
      addToast("success", "Flow saved");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const runFlow = async () => {
    if (!showValidation(validateFlow(draft, { requireSteps: true }))) return;
    set({ flowRunning: true, flowResult: undefined, flowLog: [] });
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const scopes: VariableScope[] = [];
    if (env?.variables?.length)
      scopes.push({ name: "environment", variables: env.variables });
    if (Object.keys(sessionVariables).length)
      scopes.push({ name: "session", variables: sessionVariables });
    try {
      const result = await runner.current.run(draft, {
        execute,
        scopes,
        hooks: {
          onStepStart: (step) =>
            set((s) => ({
              flowLog: [...s.flowLog, `▶ ${step.name ?? step.id}`],
            })),
          onStepComplete: (res) =>
            set((s) => ({
              flowLog: [
                ...s.flowLog,
                `${res.status === "passed" ? "✓" : "✗"} ${res.name ?? res.stepId}`,
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

  const selectedStep =
    selectedIndex !== null ? draft.steps[selectedIndex] : null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 720, height: "82vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] shrink-0">
          <input
            className="input text-sm py-1 flex-1 font-medium"
            placeholder="Flow name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <button
            onClick={handleClose}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded hover:bg-[var(--surface-2)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left: step list */}
          <div
            className="flex flex-col border-r border-[var(--border)]"
            style={{ width: 220 }}
          >
            <div className="px-4 py-2.5 border-b border-[var(--border)] shrink-0">
              <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
                Steps {draft.steps.length > 0 && `· ${draft.steps.length}`}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-3 flex flex-col">
              {draft.steps.map((step, i) => (
                <div key={step.id} className="relative flex flex-col">
                  <div
                    className={`group flex items-start gap-2.5 px-2 py-2 rounded cursor-pointer hover:bg-[var(--surface-2)] ${selectedIndex === i ? "bg-[var(--accent-subtle)]" : ""}`}
                    onClick={() => setSelectedIndex(i)}
                  >
                    <div className="relative flex flex-col items-center shrink-0 mt-0.5">
                      <div
                        className={`w-2 h-2 rounded-full ${STEP_COLORS[step.type]}`}
                      />
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
                          {step.request.method} {step.request.url || "—"}
                        </div>
                      )}
                      {step.type === "delay" && (
                        <div className="text-2xs text-[var(--text-3)]">
                          {step.delayMs}ms
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStep(i);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0 mt-0.5"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                  {/* connector */}
                  {i < draft.steps.length - 1 && (
                    <div className="w-px bg-[var(--border)] self-start ml-[18px] h-2" />
                  )}
                </div>
              ))}

              {!draft.steps.length && (
                <p className="text-xs text-[var(--text-3)] text-center py-6">
                  No steps yet
                </p>
              )}
            </div>

            {/* Add step */}
            <div className="p-3 border-t border-[var(--border)] shrink-0">
              {addingStep ? (
                <div className="flex flex-col gap-0.5">
                  {(
                    [
                      "request",
                      "delay",
                      "condition",
                      "loop",
                    ] as FlowStep["type"][]
                  ).map((t) => (
                    <button
                      key={t}
                      onClick={() => addStep(t)}
                      className="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-1)] text-left"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${STEP_COLORS[t]}`}
                      />
                      {t}
                    </button>
                  ))}
                  <button
                    onClick={() => setAddingStep(false)}
                    className="text-2xs text-[var(--text-3)] hover:text-[var(--text-1)] px-2 py-1 text-left mt-0.5"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingStep(true)}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] w-full"
                >
                  <Plus size={12} /> Add step
                </button>
              )}
            </div>
          </div>

          {/* Right: step editor */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedStep ? (
              <StepEditorPanel
                step={selectedStep}
                onChange={(s) => updateStep(selectedIndex!, s)}
                onRemove={() => removeStep(selectedIndex!)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1 text-[var(--text-3)]">
                <p className="text-sm">
                  Select a step to edit or add a new step
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Log */}
        {(flowLog.length > 0 || flowResult) && (
          <div className="border-t border-[var(--border)] bg-[var(--surface-2)] shrink-0 max-h-36 overflow-y-auto px-4 py-3 font-mono text-2xs flex flex-col gap-0.5">
            {flowLog.map((line, i) => (
              <span
                key={i}
                className={
                  line.startsWith("✓")
                    ? "text-emerald-600"
                    : line.startsWith("✗")
                      ? "text-red-600"
                      : "text-[var(--text-2)]"
                }
              >
                {line}
              </span>
            ))}
            {flowResult && (
              <div
                className={`mt-1 p-1.5 rounded text-xs font-sans ${flowResult.status === "passed" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
              >
                Flow {flowResult.status} in{" "}
                {flowResult.completedAt - flowResult.startedAt}ms
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-2)] shrink-0">
          <button onClick={handleClose} className="btn text-xs">
            Close
          </button>
          <button onClick={saveFlow} className="btn text-xs">
            Save
          </button>
          {flowRunning ? (
            <button
              onClick={stopFlow}
              className="btn btn-danger text-xs flex items-center gap-1.5"
            >
              <Square size={12} />
              Stop
            </button>
          ) : (
            <button
              onClick={runFlow}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <Play size={12} />
              Run
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FlowPanel() {
  const { flows, set, addToast } = useStore();
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNew = () =>
    setEditingFlow({
      id: "",
      name: "New Flow",
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

  const deleteFlow = async (id: string) => {
    try {
      await coreStore.deleteFlow(id);
      const fs = await coreStore.listFlows();
      set({ flows: fs });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
          Flows
        </span>
        <button
          onClick={openNew}
          className="text-[var(--text-3)] hover:text-[var(--text-1)] p-0.5"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {flows.map((flow) => (
          <div
            key={flow.id}
            className="group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--surface-2)]"
            onClick={() => setEditingFlow(flow)}
          >
            <span className="flex-1 text-xs text-[var(--text-1)] truncate">
              {flow.name}
            </span>
            <span className="text-2xs text-[var(--text-3)]">
              {flow.steps?.length ?? 0} steps
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteId(flow.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)]"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        {!flows.length && (
          <p className="p-4 text-xs text-[var(--text-3)] text-center">
            No flows yet
          </p>
        )}
      </div>

      {editingFlow && (
        <FlowModal flow={editingFlow} onClose={() => setEditingFlow(null)} />
      )}

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Delete Flow"
        message="Delete this flow?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (confirmDeleteId !== null) deleteFlow(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
