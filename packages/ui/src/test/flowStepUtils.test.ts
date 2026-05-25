import { describe, expect, it } from "vitest";
import {
  FLOW_STEP_TYPES,
  STEP_COLORS,
  STEP_LABEL_COLORS,
  makeStep,
} from "../features/flows/flowStepUtils";

describe("flow step utils", () => {
  it("defines style mappings for every supported step type", () => {
    expect(FLOW_STEP_TYPES).toEqual(["request", "delay", "condition", "loop"]);

    for (const type of FLOW_STEP_TYPES) {
      expect(STEP_COLORS[type]).toBeTruthy();
      expect(STEP_LABEL_COLORS[type]).toBeTruthy();
    }
  });

  it("creates default request steps", () => {
    const step = makeStep("request");

    expect(step).toMatchObject({
      type: "request",
      name: "Request",
      continueOnFailure: false,
      request: {
        url: "",
        method: "GET",
        bodyMode: "none",
        auth: { type: "none" },
        timeoutMs: 30000,
      },
    });
    expect(step.id).toBeTruthy();
  });

  it("creates default control-flow steps", () => {
    expect(makeStep("delay")).toMatchObject({
      type: "delay",
      name: "Delay",
      delayMs: 1000,
    });
    expect(makeStep("condition")).toMatchObject({
      type: "condition",
      name: "Condition",
      condition: {
        source: "status",
        matcher: "equals",
        expected: "200",
      },
      thenSteps: [],
    });
    expect(makeStep("loop")).toMatchObject({
      type: "loop",
      name: "Loop",
      steps: [],
      count: 3,
      maxIterations: 100,
    });
  });
});
