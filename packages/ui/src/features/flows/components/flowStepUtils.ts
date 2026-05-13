import type { FlowStep } from "@invoke/core";

export const STEP_COLORS: Record<FlowStep["type"], string> = {
  request: "bg-blue-500",
  delay: "bg-amber-500",
  condition: "bg-violet-500",
  loop: "bg-emerald-500",
};

export const STEP_LABEL_COLORS: Record<FlowStep["type"], string> = {
  request: "text-blue-600 bg-blue-50",
  delay: "text-amber-600 bg-amber-50",
  condition: "text-violet-600 bg-violet-50",
  loop: "text-emerald-600 bg-emerald-50",
};

export const FLOW_STEP_TYPES: FlowStep["type"][] = [
  "request",
  "delay",
  "condition",
  "loop",
];

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export function makeStep(type: FlowStep["type"]): FlowStep {
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
