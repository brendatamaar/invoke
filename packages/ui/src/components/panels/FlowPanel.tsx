import { useRef, useState, useCallback } from "react";
import { Play, Square, Plus, Trash2, X, GripVertical, CheckCircle2, XCircle, Clock, List, Network } from "lucide-react";
import { useStore, coreStore } from "../../store";
import {
  FlowRunner,
  validateFlow,
  type Flow,
  type FlowStep,
  type FlowStepResult,
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

const NODE_W = 180;
const NODE_H = 72;
const NODE_GAP_Y = 56;
const CANVAS_PAD = 40;

function defaultPositions(steps: FlowStep[]): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  steps.forEach((step, i) => {
    pos[step.id] = { x: CANVAS_PAD, y: CANVAS_PAD + i * (NODE_H + NODE_GAP_Y) };
  });
  return pos;
}

function FlowCanvas({
  steps,
  selectedIndex,
  flowResult,
  onSelect,
  onAddStep,
}: {
  steps: FlowStep[];
  selectedIndex: number | null;
  flowResult: import("@invoke/core").FlowResult | undefined;
  onSelect: (i: number) => void;
  onAddStep: (type: FlowStep["type"]) => void;
}) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    defaultPositions(steps),
  );
  const [addingAt, setAddingAt] = useState(false);
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null);

  // Sync new steps into positions
  const knownIds = new Set(Object.keys(positions));
  const lastKnown = steps.filter((s) => knownIds.has(s.id));
  const newSteps = steps.filter((s) => !knownIds.has(s.id));
  if (newSteps.length) {
    const maxY = lastKnown.reduce((m, s) => Math.max(m, (positions[s.id]?.y ?? 0) + NODE_H), CANVAS_PAD);
    const patch: Record<string, { x: number; y: number }> = {};
    newSteps.forEach((s, i) => {
      patch[s.id] = { x: CANVAS_PAD, y: maxY + NODE_GAP_Y + i * (NODE_H + NODE_GAP_Y) };
    });
    setPositions((p) => ({ ...p, ...patch }));
  }

  const canvasWidth = Math.max(
    500,
    ...steps.map((s) => (positions[s.id]?.x ?? 0) + NODE_W + CANVAS_PAD),
  );
  const canvasHeight = Math.max(
    300,
    ...steps.map((s) => (positions[s.id]?.y ?? 0) + NODE_H + CANVAS_PAD + 60),
  );

  const onMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const pos = positions[id] ?? { x: 0, y: 0 };
    dragging.current = { id, ox: e.clientX - pos.x, oy: e.clientY - pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const { id: did, ox, oy } = dragging.current;
      setPositions((p) => ({ ...p, [did]: { x: Math.max(0, ev.clientX - ox), y: Math.max(0, ev.clientY - oy) } }));
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [positions]);

  return (
    <div className="relative w-full h-full overflow-auto bg-[var(--surface-2)]"
      style={{ backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
    >
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: canvasWidth, height: canvasHeight, pointerEvents: "none" }}
      >
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--border-strong)" />
          </marker>
        </defs>
        {steps.map((step, i) => {
          if (i === 0) return null;
          const from = positions[steps[i - 1].id];
          const to = positions[step.id];
          if (!from || !to) return null;
          const x1 = from.x + NODE_W / 2;
          const y1 = from.y + NODE_H;
          const x2 = to.x + NODE_W / 2;
          const y2 = to.y;
          const mid = (y1 + y2) / 2;
          return (
            <path
              key={step.id}
              d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="1.5"
              markerEnd="url(#arrow)"
            />
          );
        })}
      </svg>

      <div style={{ position: "relative", width: canvasWidth, height: canvasHeight }}>
        {steps.map((step, i) => {
          const pos = positions[step.id] ?? { x: CANVAS_PAD, y: CANVAS_PAD };
          const stepResult = flowResult?.steps.find((r) => r.stepId === step.id);
          const isSelected = selectedIndex === i;
          const statusColor = stepResult
            ? stepResult.status === "passed" ? "border-emerald-500" : "border-red-500"
            : isSelected ? "border-[var(--accent)]" : "border-[var(--border)]";

          return (
            <div
              key={step.id}
              style={{ position: "absolute", left: pos.x, top: pos.y, width: NODE_W, height: NODE_H, cursor: "grab", userSelect: "none" }}
              className={`bg-[var(--surface)] rounded-lg border-2 shadow-sm flex flex-col px-3 py-2 gap-0.5 ${statusColor} ${isSelected ? "shadow-md" : ""}`}
              onMouseDown={(e) => onMouseDown(e, step.id)}
              onClick={() => onSelect(i)}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${STEP_COLORS[step.type]}`} />
                <span className="text-2xs text-[var(--text-3)] uppercase tracking-wide">{step.type}</span>
                {stepResult && (
                  stepResult.status === "passed"
                    ? <CheckCircle2 size={10} className="ml-auto text-emerald-500" />
                    : <XCircle size={10} className="ml-auto text-red-500" />
                )}
              </div>
              <div className="text-xs font-medium text-[var(--text-1)] truncate">{step.name}</div>
              {step.type === "request" && (
                <div className="text-2xs text-[var(--text-3)] truncate">{step.request.method} {step.request.url || "—"}</div>
              )}
              {step.type === "delay" && (
                <div className="text-2xs text-[var(--text-3)]">{step.delayMs}ms</div>
              )}
              {stepResult?.response?.status && (
                <div className="flex items-center gap-1 text-2xs text-[var(--text-3)]">
                  <Clock size={9} />{stepResult.completedAt - stepResult.startedAt}ms · {stepResult.response.status}
                </div>
              )}
            </div>
          );
        })}

        {/* Add step button on canvas */}
        <div style={{ position: "absolute", left: CANVAS_PAD, top: canvasHeight - 52 }}>
          {addingAt ? (
            <div className="flex gap-1">
              {(["request", "delay", "condition", "loop"] as FlowStep["type"][]).map((t) => (
                <button
                  key={t}
                  onClick={() => { onAddStep(t); setAddingAt(false); }}
                  className="flex items-center gap-1 text-2xs px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)]"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${STEP_COLORS[t]}`} />
                  {t}
                </button>
              ))}
              <button onClick={() => setAddingAt(false)} className="text-2xs px-2 py-1 text-[var(--text-3)]">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setAddingAt(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] bg-[var(--surface)] border border-[var(--border)] rounded px-2.5 py-1.5 shadow-sm"
            >
              <Plus size={12} /> Add step
            </button>
          )}
        </div>
      </div>
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
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "canvas">("list");
  const dragIndex = useRef<number | null>(null);

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

  const reorderStep = (from: number, to: number) => {
    if (from === to) return;
    const steps = [...draft.steps];
    const [moved] = steps.splice(from, 1);
    steps.splice(to, 0, moved);
    setDraft({ ...draft, steps });
    setSelectedIndex(to);
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
        style={{ width: viewMode === "canvas" ? "90vw" : 720, height: "82vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] shrink-0">
          <input
            className="input text-sm py-1 flex-1 font-medium"
            placeholder="Flow name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          {/* View toggle */}
          <div className="flex rounded border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-2 py-1 text-2xs flex items-center gap-1 ${viewMode === "list" ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:bg-[var(--surface-2)]"}`}
              title="List view"
            >
              <List size={12} /> List
            </button>
            <button
              onClick={() => setViewMode("canvas")}
              className={`px-2 py-1 text-2xs flex items-center gap-1 ${viewMode === "canvas" ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:bg-[var(--surface-2)]"}`}
              title="Canvas view"
            >
              <Network size={12} /> Canvas
            </button>
          </div>
          <button
            onClick={handleClose}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded hover:bg-[var(--surface-2)]"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {viewMode === "canvas" && (
            <div className="flex flex-1 min-h-0 min-w-0">
              <div className="flex-1 min-w-0 overflow-hidden">
                <FlowCanvas
                  steps={draft.steps}
                  selectedIndex={selectedIndex}
                  flowResult={flowResult}
                  onSelect={setSelectedIndex}
                  onAddStep={(type) => {
                    const step = makeStep(type);
                    const steps = [...draft.steps, step];
                    setDraft({ ...draft, steps });
                    setSelectedIndex(steps.length - 1);
                  }}
                />
              </div>
              {selectedIndex !== null && draft.steps[selectedIndex] && (
                <div className="border-l border-[var(--border)] overflow-y-auto p-5 shrink-0" style={{ width: 280 }}>
                  <StepEditorPanel
                    step={draft.steps[selectedIndex]}
                    onChange={(s) => updateStep(selectedIndex, s)}
                    onRemove={() => removeStep(selectedIndex)}
                  />
                </div>
              )}
            </div>
          )}

          {viewMode === "list" && (
          <>
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
              {draft.steps.map((step, i) => {
                const stepResult = flowResult?.steps.find((r: FlowStepResult) => r.stepId === step.id);
                const isDragTarget = dragOver === i;
                return (
                  <div
                    key={step.id}
                    className="relative flex flex-col"
                    draggable
                    onDragStart={() => { dragIndex.current = i; }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => {
                      if (dragIndex.current !== null) reorderStep(dragIndex.current, i);
                      dragIndex.current = null;
                      setDragOver(null);
                    }}
                  >
                    {isDragTarget && <div className="h-0.5 bg-[var(--accent)] rounded mx-1 mb-1" />}
                    <div
                      className={`group flex items-start gap-1.5 px-2 py-2 rounded cursor-pointer hover:bg-[var(--surface-2)] ${selectedIndex === i ? "bg-[var(--accent-subtle)]" : ""}`}
                      onClick={() => setSelectedIndex(i)}
                    >
                      <GripVertical size={11} className="text-[var(--text-3)] opacity-0 group-hover:opacity-100 shrink-0 mt-1 cursor-grab" />
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
                            {step.request.method} {step.request.url || "—"}
                          </div>
                        )}
                        {step.type === "delay" && (
                          <div className="text-2xs text-[var(--text-3)]">
                            {step.delayMs}ms
                          </div>
                        )}
                        {stepResult && (
                          <div className={`flex items-center gap-1 text-2xs mt-0.5 ${stepResult.status === "passed" ? "text-emerald-600" : "text-red-500"}`}>
                            {stepResult.status === "passed"
                              ? <CheckCircle2 size={10} />
                              : <XCircle size={10} />}
                            <span className="flex items-center gap-0.5 text-[var(--text-3)]">
                              <Clock size={9} />{stepResult.completedAt - stepResult.startedAt}ms
                            </span>
                            {stepResult.response?.status && (
                              <span>{stepResult.response.status}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeStep(i); }}
                        className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0 mt-0.5"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    {i < draft.steps.length - 1 && (
                      <div className="w-px bg-[var(--border)] self-start ml-[22px] h-2" />
                    )}
                  </div>
                );
              })}

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
          </>
          )}
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
