import { Cause, Duration, Effect, Exit, Fiber, Schedule } from "effect";
import { JSONPath } from "jsonpath-plus";
import { runAssertions } from "../assertions";
import { StepExecutionError, StepTimeoutError } from "../errors";
import { extractVariables, resolveRequest } from "../variables";
import type {
  AssertionMatcher,
  ExecuteResponse,
  Flow,
  FlowCondition,
  FlowRequestStep,
  FlowResult,
  FlowRunnerOptions,
  FlowStatus,
  FlowStep,
  FlowStepResult,
} from "../types";

export class FlowRunner {
  private fiber: Fiber.RuntimeFiber<FlowResult, never> | null = null;

  cancel(): void {
    if (this.fiber) Effect.runFork(Fiber.interrupt(this.fiber));
  }

  async run(flow: Flow, options: FlowRunnerOptions): Promise<FlowResult> {
    const startedAt = Date.now();
    // Plain objects mutated inside the Effect — safe because JS is single-threaded
    // and these refs survive Fiber interruption so we can build a partial result.
    const variables: Record<string, string> = {};
    const results: FlowStepResult[] = [];

    this.fiber = Effect.runFork(flowEffect(flow, options, startedAt, variables, results));

    const exit = await Effect.runPromise(Fiber.await(this.fiber));
    this.fiber = null;

    if (Exit.isSuccess(exit)) return exit.value;

    if (Cause.isInterruptedOnly(exit.cause)) {
      return {
        flowId: flow.id,
        status: "cancelled",
        startedAt,
        completedAt: Date.now(),
        variables,
        steps: results,
      };
    }

    throw new Error(Cause.pretty(exit.cause));
  }
}

// ---------------------------------------------------------------------------
// Internal Effect pipeline
// ---------------------------------------------------------------------------

function flowEffect(
  flow: Flow,
  options: FlowRunnerOptions,
  startedAt: number,
  variables: Record<string, string>,
  results: FlowStepResult[],
): Effect.Effect<FlowResult, never> {
  return Effect.gen(function* () {
    yield* stepsEffect(flow.steps, variables, results, options);

    const status: FlowStatus = results.some((r) => r.status === "failed") ? "failed" : "passed";

    const result: FlowResult = {
      flowId: flow.id,
      status,
      startedAt,
      completedAt: Date.now(),
      variables,
      steps: results,
    };

    if (options.hooks?.onFlowComplete) {
      yield* Effect.promise(() => Promise.resolve(options.hooks!.onFlowComplete!(result)));
    }

    return result;
  });
}

function stepsEffect(
  steps: FlowStep[],
  variables: Record<string, string>,
  results: FlowStepResult[],
  options: FlowRunnerOptions,
): Effect.Effect<void, never> {
  return Effect.gen(function* () {
    for (const step of steps) {
      yield* stepEffect(step, variables, results, options);
      const last = results[results.length - 1];
      if (last?.status === "failed" && step.type === "request" && !step.continueOnFailure) return;
    }
  });
}

function stepEffect(
  step: FlowStep,
  variables: Record<string, string>,
  results: FlowStepResult[],
  options: FlowRunnerOptions,
): Effect.Effect<void, never> {
  if (step.type === "delay") return delayEffect(step, results, options);
  if (step.type === "condition") return conditionEffect(step, variables, results, options);
  if (step.type === "loop") return loopEffect(step, variables, results, options);
  return requestEffect(step, variables, results, options);
}

function delayEffect(
  step: Extract<FlowStep, { type: "delay" }>,
  results: FlowStepResult[],
  options: FlowRunnerOptions,
): Effect.Effect<void, never> {
  return Effect.gen(function* () {
    if (options.hooks?.onStepStart) {
      yield* Effect.promise(() => Promise.resolve(options.hooks!.onStepStart!(step)));
    }
    const startedAt = Date.now();
    yield* Effect.sleep(Duration.millis(Math.max(0, step.delayMs)));
    const result = makeStepResult(step, "passed", startedAt);
    results.push(result);
    if (options.hooks?.onStepComplete) {
      yield* Effect.promise(() => Promise.resolve(options.hooks!.onStepComplete!(result)));
    }
  });
}

function conditionEffect(
  step: Extract<FlowStep, { type: "condition" }>,
  variables: Record<string, string>,
  results: FlowStepResult[],
  options: FlowRunnerOptions,
): Effect.Effect<void, never> {
  return Effect.gen(function* () {
    if (options.hooks?.onStepStart) {
      yield* Effect.promise(() => Promise.resolve(options.hooks!.onStepStart!(step)));
    }
    const branch = evaluateCondition(
      step.condition,
      variables,
      results[results.length - 1]?.response,
    )
      ? step.thenSteps
      : (step.elseSteps ?? []);
    const result = makeStepResult(step, "passed", Date.now());
    results.push(result);
    if (options.hooks?.onStepComplete) {
      yield* Effect.promise(() => Promise.resolve(options.hooks!.onStepComplete!(result)));
    }
    yield* stepsEffect(branch, variables, results, options);
  });
}

function loopEffect(
  step: Extract<FlowStep, { type: "loop" }>,
  variables: Record<string, string>,
  results: FlowStepResult[],
  options: FlowRunnerOptions,
): Effect.Effect<void, never> {
  return Effect.gen(function* () {
    if (options.hooks?.onStepStart) {
      yield* Effect.promise(() => Promise.resolve(options.hooks!.onStepStart!(step)));
    }
    const startedAt = Date.now();
    const maxIterations = loopMaxIterations(step.count, step.maxIterations);
    for (let index = 0; index < maxIterations; index += 1) {
      if (
        !shouldRunLoopIteration(
          step.condition,
          step.conditionMode,
          variables,
          results[results.length - 1]?.response,
        )
      )
        break;
      variables["$loop.iteration"] = String(index);
      yield* stepsEffect(step.steps, variables, results, options);
    }
    const result = makeStepResult(step, "passed", startedAt);
    results.push(result);
    if (options.hooks?.onStepComplete) {
      yield* Effect.promise(() => Promise.resolve(options.hooks!.onStepComplete!(result)));
    }
  });
}

function requestEffect(
  step: FlowRequestStep,
  variables: Record<string, string>,
  results: FlowStepResult[],
  options: FlowRunnerOptions,
): Effect.Effect<void, never> {
  const startedAt = Date.now();
  const timeoutMs = step.request.timeoutMs ?? 30_000;

  const attempt = Effect.tryPromise({
    try: () => {
      const { request: resolved } = resolveRequest(step.request, [
        ...(options.scopes ?? []),
        { name: "flow", variables },
      ]);
      return options.execute(resolved);
    },
    catch: (e) => new StepExecutionError({ stepId: step.id, cause: e }),
  }).pipe(
    Effect.timeout(Duration.millis(timeoutMs)),
    Effect.mapError((e): StepTimeoutError | StepExecutionError =>
      e._tag === "TimeoutException"
        ? new StepTimeoutError({ stepId: step.id, timeoutMs })
        : (e as StepExecutionError),
    ),
  );

  const retryCount = step.retryCount ?? 0;
  const executeWithRetry =
    retryCount > 0
      ? attempt.pipe(
          Effect.retry(
            Schedule.exponential("500 millis").pipe(
              Schedule.intersect(Schedule.recurs(retryCount)),
            ),
          ),
        )
      : attempt;

  return Effect.gen(function* () {
    if (options.hooks?.onStepStart) {
      yield* Effect.promise(() => Promise.resolve(options.hooks!.onStepStart!(step)));
    }

    const outcome = yield* Effect.either(executeWithRetry);

    let result: FlowStepResult;

    if (outcome._tag === "Right") {
      const response = outcome.right;
      const assertions = runAssertions(response, step.request.assertions ?? []);
      const extracted = extractVariables(response, step.request.extractionRules ?? []);

      for (const [name, value] of Object.entries(extracted)) {
        variables[name] = value;
        if (options.hooks?.onVariableExtracted) {
          yield* Effect.promise(() =>
            Promise.resolve(options.hooks!.onVariableExtracted!(name, value, step)),
          );
        }
      }

      const status: FlowStatus =
        response.error || assertions.some((a) => !a.passed) ? "failed" : "passed";

      result = makeStepResult(step, status, startedAt, {
        response,
        assertions,
        error: response.error,
      });
    } else {
      const error = outcome.left;
      const message =
        error._tag === "StepTimeoutError"
          ? `Step timed out after ${(error as StepTimeoutError).timeoutMs}ms`
          : String((error as StepExecutionError).cause);

      if (options.hooks?.onError) {
        yield* Effect.promise(() =>
          Promise.resolve(options.hooks!.onError!(new Error(message), step)),
        );
      }

      result = makeStepResult(step, "failed", startedAt, { error: message });
    }

    results.push(result);

    if (options.hooks?.onStepComplete) {
      yield* Effect.promise(() => Promise.resolve(options.hooks!.onStepComplete!(result)));
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStepResult(
  step: FlowStep,
  status: FlowStatus,
  startedAt: number,
  extra: Partial<FlowStepResult> = {},
): FlowStepResult {
  return {
    stepId: step.id,
    name: step.name,
    type: step.type,
    status,
    startedAt,
    completedAt: Date.now(),
    ...extra,
  };
}

function evaluateCondition(
  condition: FlowCondition,
  variables: Record<string, string>,
  response?: ExecuteResponse,
) {
  const actual = conditionActual(condition, variables, response);
  return compare(actual, condition.expected, condition.matcher);
}

function conditionActual(
  condition: FlowCondition,
  variables: Record<string, string>,
  response?: ExecuteResponse,
) {
  if (condition.source === "variable") return variables[condition.expression];
  if (!response) return undefined;
  if (condition.source === "status") return response.status;
  if (condition.source === "header") {
    return response.headers.find(
      (header) => header.key.toLowerCase() === condition.expression.toLowerCase(),
    )?.value;
  }
  try {
    return JSONPath({
      path: condition.expression,
      json: JSON.parse(response.body),
      wrap: false,
    });
  } catch {
    return undefined;
  }
}

function compare(actual: unknown, expected: string, matcher: AssertionMatcher) {
  if (matcher === "exists") return actual !== undefined && actual !== null;
  if (matcher === "notEquals") return String(actual) !== expected;
  if (matcher === "contains") return String(actual ?? "").includes(expected);
  if (matcher === "matches") {
    try {
      return new RegExp(expected).test(String(actual ?? ""));
    } catch {
      return false;
    }
  }
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
  response?: ExecuteResponse,
) {
  if (!condition) return true;
  const matched = evaluateCondition(condition, variables, response);
  return mode === "until" ? !matched : matched;
}
