import { useCallback, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { CheckCircle2, Clock, Plus, XCircle } from "lucide-react";
import type { FlowResult, FlowStep } from "@invoke/core";
import { FLOW_STEP_TYPES, STEP_COLORS } from "./flowStepUtils";

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

export function FlowCanvas({
  steps,
  selectedIndex,
  flowResult,
  onSelect,
  onAddStep,
}: {
  steps: FlowStep[];
  selectedIndex: number | null;
  flowResult: FlowResult | undefined;
  onSelect: (i: number) => void;
  onAddStep: (type: FlowStep["type"]) => void;
}) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    defaultPositions(steps),
  );
  const [addingAt, setAddingAt] = useState(false);
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null);

  const knownIds = new Set(Object.keys(positions));
  const lastKnown = steps.filter((s) => knownIds.has(s.id));
  const newSteps = steps.filter((s) => !knownIds.has(s.id));
  if (newSteps.length) {
    const maxY = lastKnown.reduce(
      (m, s) => Math.max(m, (positions[s.id]?.y ?? 0) + NODE_H),
      CANVAS_PAD,
    );
    const patch: Record<string, { x: number; y: number }> = {};
    newSteps.forEach((s, i) => {
      patch[s.id] = {
        x: CANVAS_PAD,
        y: maxY + NODE_GAP_Y + i * (NODE_H + NODE_GAP_Y),
      };
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

  const onMouseDown = useCallback(
    (e: MouseEvent, id: string) => {
      e.stopPropagation();
      const pos = positions[id] ?? { x: 0, y: 0 };
      dragging.current = { id, ox: e.clientX - pos.x, oy: e.clientY - pos.y };
      const onMove = (ev: globalThis.MouseEvent) => {
        if (!dragging.current) return;
        const { id: did, ox, oy } = dragging.current;
        setPositions((p) => ({
          ...p,
          [did]: {
            x: Math.max(0, ev.clientX - ox),
            y: Math.max(0, ev.clientY - oy),
          },
        }));
      };
      const onUp = () => {
        dragging.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [positions],
  );

  return (
    <div
      className="relative w-full h-full overflow-auto bg-[var(--surface-2)]"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--border) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: canvasWidth,
          height: canvasHeight,
          pointerEvents: "none",
        }}
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
            ? stepResult.status === "passed"
              ? "border-emerald-500"
              : "border-red-500"
            : isSelected
              ? "border-[var(--accent)]"
              : "border-[var(--border)]";

          return (
            <div
              key={step.id}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                width: NODE_W,
                height: NODE_H,
                cursor: "grab",
                userSelect: "none",
              }}
              className={`bg-[var(--surface)] rounded-lg border-2 shadow-sm flex flex-col px-3 py-2 gap-0.5 ${statusColor} ${isSelected ? "shadow-md" : ""}`}
              onMouseDown={(e) => onMouseDown(e, step.id)}
              onClick={() => onSelect(i)}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${STEP_COLORS[step.type]}`} />
                <span className="text-2xs text-[var(--text-3)] uppercase tracking-wide">
                  {step.type}
                </span>
                {stepResult &&
                  (stepResult.status === "passed" ? (
                    <CheckCircle2 size={10} className="ml-auto text-emerald-500" />
                  ) : (
                    <XCircle size={10} className="ml-auto text-red-500" />
                  ))}
              </div>
              <div className="text-xs font-medium text-[var(--text-1)] truncate">
                {step.name}
              </div>
              {step.type === "request" && (
                <div className="text-2xs text-[var(--text-3)] truncate">
                  {step.request.method} {step.request.url || "-"}
                </div>
              )}
              {step.type === "delay" && (
                <div className="text-2xs text-[var(--text-3)]">{step.delayMs}ms</div>
              )}
              {stepResult?.response?.status && (
                <div className="flex items-center gap-1 text-2xs text-[var(--text-3)]">
                  <Clock size={9} />
                  {stepResult.completedAt - stepResult.startedAt}ms -{" "}
                  {stepResult.response.status}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ position: "absolute", left: CANVAS_PAD, top: canvasHeight - 52 }}>
          {addingAt ? (
            <div className="flex gap-1">
              {FLOW_STEP_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    onAddStep(t);
                    setAddingAt(false);
                  }}
                  className="flex items-center gap-1 text-2xs px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)]"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${STEP_COLORS[t]}`} />
                  {t}
                </button>
              ))}
              <button
                onClick={() => setAddingAt(false)}
                className="text-2xs px-2 py-1 text-[var(--text-3)]"
              >
                x
              </button>
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
