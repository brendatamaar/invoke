import type { FlowStep } from "@invoke/core";

export const NODE_W = 180;
export const NODE_H = 72;
export const NODE_GAP_Y = 56;
export const CANVAS_PAD = 40;

export function defaultPositions(steps: FlowStep[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  steps.forEach((step, index) => {
    positions[step.id] = {
      x: CANVAS_PAD,
      y: CANVAS_PAD + index * (NODE_H + NODE_GAP_Y),
    };
  });
  return positions;
}
