import { JSONPath } from "jsonpath-plus";
import { runAssertions } from "./assertions";
import { extractVariables, resolveRequest } from "./variables";
import type {
  AssertionMatcher,
  ExecuteResponse,
  Flow,
  FlowCondition,
  FlowResult,
  FlowStatus,
  FlowStep,
  FlowStepResult,
  FlowRunnerOptions
} from "./types";

export class FlowRunner {
  private cancelled = false;

  cancel() {
    this.cancelled = true;
  }

  async run(flow: Flow, options: FlowRunnerOptions): Promise<FlowResult> {
    this.cancelled = false;
    const startedAt = Date.now();
    const variables: Record<string, string> = {};
    const results: FlowStepResult[] = [];
    await this.runSteps(flow.steps, flow, variables, results, options);
    const status: FlowStatus = this.cancelled ? "cancelled" : results.some((result) => result.status === "failed") ? "failed" : "passed";
    const result: FlowResult = {
      flowId: flow.id,
      status,
      startedAt,
      completedAt: Date.now(),
      variables,
      steps: results
    };
    await options.hooks?.onFlowComplete?.(result);
    return result;
  }

  private async runSteps(
    steps: FlowStep[],
    flow: Flow,
    variables: Record<string, string>,
    results: FlowStepResult[],
    options: FlowRunnerOptions
  ) {
    for (const step of steps) {
      if (this.cancelled) return;
      await this.runStep(step, flow, variables, results, options);
      const last = results[results.length - 1];
      if (last?.status === "failed" && step.type === "request" && !step.continueOnFailure) return;
    }
  }

  private async runStep(
    step: FlowStep,
    flow: Flow,
    variables: Record<string, string>,
    results: FlowStepResult[],
    options: FlowRunnerOptions
  ) {
    await options.hooks?.onStepStart?.(step);
    if (step.type === "delay") {
      const startedAt = Date.now();
      await sleep(step.delayMs);
      const result = stepResult(step, "passed", startedAt);
      results.push(result);
      await options.hooks?.onStepComplete?.(result);
      return;
    }
    if (step.type === "condition") {
      const branch = evaluateCondition(step.condition, variables, results[results.length - 1]?.response) ? step.thenSteps : step.elseSteps ?? [];
      const result = stepResult(step, "passed", Date.now());
      results.push(result);
      await options.hooks?.onStepComplete?.(result);
      await this.runSteps(branch, flow, variables, results, options);
      return;
    }
    if (step.type === "loop") {
      const startedAt = Date.now();
      const maxIterations = loopMaxIterations(step.count, step.maxIterations);
      for (let index = 0; index < maxIterations && !this.cancelled; index += 1) {
        if (!shouldRunLoopIteration(step.condition, step.conditionMode, variables, results[results.length - 1]?.response)) break;
        variables["$loop.iteration"] = String(index);
        await this.runSteps(step.steps, flow, variables, results, options);
      }
      const result = stepResult(step, this.cancelled ? "cancelled" : "passed", startedAt);
      results.push(result);
      await options.hooks?.onStepComplete?.(result);
      return;
    }

    const startedAt = Date.now();
    try {
      const resolved = resolveRequest(step.request, [...(options.scopes ?? []), { name: "flow", variables }]);
      const response = await options.execute(resolved.request);
      const assertions = runAssertions(response, step.request.assertions ?? []);
      const extracted = extractVariables(response, step.request.extractionRules ?? []);
      for (const [name, value] of Object.entries(extracted)) {
        variables[name] = value;
        await options.hooks?.onVariableExtracted?.(name, value, step);
      }
      const status: FlowStatus = response.error || assertions.some((assertion) => !assertion.passed) ? "failed" : "passed";
      const result = stepResult(step, status, startedAt, { response, assertions, error: response.error });
      results.push(result);
      await options.hooks?.onStepComplete?.(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await options.hooks?.onError?.(err, step);
      const result = stepResult(step, "failed", startedAt, { error: err.message });
      results.push(result);
      await options.hooks?.onStepComplete?.(result);
    }
  }
}

function stepResult(
  step: FlowStep,
  status: FlowStatus,
  startedAt: number,
  extra: Partial<FlowStepResult> = {}
): FlowStepResult {
  return {
    stepId: step.id,
    name: step.name,
    type: step.type,
    status,
    startedAt,
    completedAt: Date.now(),
    ...extra
  };
}

function evaluateCondition(condition: FlowCondition, variables: Record<string, string>, response?: ExecuteResponse) {
  const actual = conditionActual(condition, variables, response);
  return compare(actual, condition.expected, condition.matcher);
}

function conditionActual(condition: FlowCondition, variables: Record<string, string>, response?: ExecuteResponse) {
  if (condition.source === "variable") return variables[condition.expression];
  if (!response) return undefined;
  if (condition.source === "status") return response.status;
  if (condition.source === "header") {
    return response.headers.find((header) => header.key.toLowerCase() === condition.expression.toLowerCase())?.value;
  }
  try {
    return JSONPath({ path: condition.expression, json: JSON.parse(response.body), wrap: false });
  } catch {
    return undefined;
  }
}

function compare(actual: unknown, expected: string, matcher: AssertionMatcher) {
  if (matcher === "exists") return actual !== undefined && actual !== null;
  if (matcher === "notEquals") return String(actual) !== expected;
  if (matcher === "contains") return String(actual ?? "").includes(expected);
  if (matcher === "matches") return new RegExp(expected).test(String(actual ?? ""));
  if (matcher === "gt") return Number(actual) > Number(expected);
  if (matcher === "lt") return Number(actual) < Number(expected);
  return String(actual) === expected;
}

function loopMaxIterations(count?: number, maxIterations?: number) {
  const safeMax = Math.max(0, maxIterations ?? 1000);
  if (count == null) return safeMax;
  return Math.min(Math.max(0, count), safeMax);
}

function shouldRunLoopIteration(
  condition: FlowCondition | undefined,
  mode: "while" | "until" | undefined,
  variables: Record<string, string>,
  response?: ExecuteResponse
) {
  if (!condition) return true;
  const matched = evaluateCondition(condition, variables, response);
  return mode === "until" ? !matched : matched;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}
