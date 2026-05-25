import { useCallback, useRef, useState } from "react";
import type { Dispatch, MouseEvent, SetStateAction } from "react";
import type { FlowResult, FlowStep } from "@invoke/core";
import { AddStepControls } from "./canvas/AddStepControls";
import { FlowEdges } from "./canvas/FlowEdges";
import { FlowNode } from "./canvas/FlowNode";
import {
  CANVAS_PAD,
  NODE_GAP_Y,
  NODE_H,
  NODE_W,
  defaultPositions,
} from "../utils/layout";

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
  onSelect: (index: number) => void;
  onAddStep: (type: FlowStep["type"]) => void;
}) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(
    () => defaultPositions(steps),
  );
  const [addingAt, setAddingAt] = useState(false);
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const canvasSize = ensurePositions(steps, positions, setPositions);

  const onMouseDown = useCallback(
    (event: MouseEvent, id: string) => {
      event.stopPropagation();
      const pos = positions[id] ?? { x: 0, y: 0 };
      dragging.current = { id, ox: event.clientX - pos.x, oy: event.clientY - pos.y };
      const onMove = (moveEvent: globalThis.MouseEvent) => {
        if (!dragging.current) return;
        const { id: movedId, ox, oy } = dragging.current;
        setPositions((previous) => ({
          ...previous,
          [movedId]: {
            x: Math.max(0, moveEvent.clientX - ox),
            y: Math.max(0, moveEvent.clientY - oy),
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
          width: canvasSize.width,
          height: canvasSize.height,
          pointerEvents: "none",
        }}
      >
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="var(--border-strong)" />
          </marker>
        </defs>
        <FlowEdges steps={steps} positions={positions} />
      </svg>
      <div style={{ position: "relative", width: canvasSize.width, height: canvasSize.height }}>
        {steps.map((step, index) => (
          <FlowNode
            key={step.id}
            step={step}
            index={index}
            position={positions[step.id] ?? { x: CANVAS_PAD, y: CANVAS_PAD }}
            selected={selectedIndex === index}
            stepResult={flowResult?.steps.find((result) => result.stepId === step.id)}
            onMouseDown={onMouseDown}
            onSelect={onSelect}
          />
        ))}
        <div style={{ position: "absolute", left: CANVAS_PAD, top: canvasSize.height - 52 }}>
          <AddStepControls
            adding={addingAt}
            onAddingChange={setAddingAt}
            onAddStep={onAddStep}
          />
        </div>
      </div>
    </div>
  );
}

function ensurePositions(
  steps: FlowStep[],
  positions: Record<string, { x: number; y: number }>,
  setPositions: Dispatch<SetStateAction<Record<string, { x: number; y: number }>>>,
) {
  const knownIds = new Set(Object.keys(positions));
  const lastKnown = steps.filter((step) => knownIds.has(step.id));
  const newSteps = steps.filter((step) => !knownIds.has(step.id));
  if (newSteps.length) {
    const maxY = lastKnown.reduce(
      (max, step) => Math.max(max, (positions[step.id]?.y ?? 0) + NODE_H),
      CANVAS_PAD,
    );
    const patch: Record<string, { x: number; y: number }> = {};
    newSteps.forEach((step, index) => {
      patch[step.id] = {
        x: CANVAS_PAD,
        y: maxY + NODE_GAP_Y + index * (NODE_H + NODE_GAP_Y),
      };
    });
    setPositions((previous) => ({ ...previous, ...patch }));
  }
  return {
    width: Math.max(
      500,
      ...steps.map((step) => (positions[step.id]?.x ?? 0) + NODE_W + CANVAS_PAD),
    ),
    height: Math.max(
      300,
      ...steps.map((step) => (positions[step.id]?.y ?? 0) + NODE_H + CANVAS_PAD + 60),
    ),
  };
}
