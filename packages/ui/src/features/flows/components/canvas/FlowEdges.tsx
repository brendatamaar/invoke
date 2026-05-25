import type { FlowStep } from "@invoke/core";
import { NODE_H, NODE_W } from "../../utils/layout";

export function FlowEdges({
  steps,
  positions,
}: {
  steps: FlowStep[];
  positions: Record<string, { x: number; y: number }>;
}) {
  return (
    <>
      {steps.map((step, index) => {
        if (index === 0) return null;
        const from = positions[steps[index - 1].id];
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
    </>
  );
}
