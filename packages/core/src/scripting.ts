import type {
  ExecuteResponse,
  ProtocolRequestConfig,
  ScriptExecutionResult,
  ScriptRunOptions,
} from "./types";
import { clonePlain } from "./request";

export async function runPreRequestScript<
  TRequest extends ProtocolRequestConfig,
>(
  request: TRequest,
  variables: Record<string, string>,
  code = "",
  options: ScriptRunOptions = {},
): Promise<ScriptExecutionResult<TRequest>> {
  return runScript(request, variables, code, options);
}

export async function runPostResponseScript<
  TRequest extends ProtocolRequestConfig,
>(
  request: TRequest,
  response: ExecuteResponse,
  variables: Record<string, string>,
  code = "",
  options: ScriptRunOptions = {},
): Promise<ScriptExecutionResult<TRequest>> {
  return runScript(request, variables, code, { ...options, response });
}

async function runScript<TRequest extends ProtocolRequestConfig>(
  request: TRequest,
  variables: Record<string, string>,
  code: string,
  options: ScriptRunOptions,
): Promise<ScriptExecutionResult<TRequest>> {
  if (!code.trim()) {
    return {
      request: clonePlain(request),
      variables: { ...variables },
      logs: [],
    };
  }
  if (
    typeof Worker !== "undefined" &&
    typeof Blob !== "undefined" &&
    typeof URL !== "undefined"
  ) {
    return runInWorker(request, variables, code, options);
  }
  return runInline(request, variables, code, options);
}

function runInWorker<TRequest extends ProtocolRequestConfig>(
  request: TRequest,
  variables: Record<string, string>,
  code: string,
  options: ScriptRunOptions,
): Promise<ScriptExecutionResult<TRequest>> {
  return new Promise((resolve, reject) => {
    const workerUrl = URL.createObjectURL(
      new Blob([workerSource()], { type: "text/javascript" }),
    );
    const worker = new Worker(workerUrl);
    const timeout = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error("Script timed out"));
    }, options.timeoutMs ?? 5000);

    worker.onmessage = (
      event: MessageEvent<ScriptExecutionResult<TRequest> | { error: string }>,
    ) => {
      clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      if ("error" in event.data) reject(new Error(event.data.error));
      else resolve(event.data);
    };
    worker.onerror = (event) => {
      clearTimeout(timeout);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error(event.message));
    };
    worker.postMessage({
      request: clonePlain(request),
      variables: { ...variables },
      response: options.response,
      code,
    });
  });
}

async function runInline<TRequest extends ProtocolRequestConfig>(
  request: TRequest,
  variables: Record<string, string>,
  code: string,
  options: ScriptRunOptions,
): Promise<ScriptExecutionResult<TRequest>> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const execute = async () =>
    executeScript(
      clonePlain(request),
      { ...variables },
      code,
      options.response,
    );
  return Promise.race([
    execute(),
    new Promise<ScriptExecutionResult<TRequest>>((_, reject) => {
      setTimeout(() => reject(new Error("Script timed out")), timeoutMs);
    }),
  ]);
}

function executeScript<TRequest extends ProtocolRequestConfig>(
  request: TRequest,
  variables: Record<string, string>,
  code: string,
  response?: ExecuteResponse,
): Promise<ScriptExecutionResult<TRequest>> {
  const logs: string[] = [];
  const state = { skipped: false, skipReason: "" };
  const variableApi = {
    get: (key: string) => variables[key],
    set: (key: string, value: unknown) => {
      if (key.trim()) variables[key.trim()] = String(value);
    },
    unset: (key: string) => {
      delete variables[key];
    },
    all: () => ({ ...variables }),
  };
  const invoke = {
    request,
    response,
    variables: variableApi,
    uuid: () => randomUuid(),
    setHeader: (key: string, value: unknown) =>
      upsertKeyValue((request as any).headers, key, String(value)),
    setParam: (key: string, value: unknown) =>
      upsertKeyValue((request as any).params, key, String(value)),
    setBody: (value: unknown) => {
      (request as any).body =
        typeof value === "string" ? value : JSON.stringify(value, null, 2);
    },
    setUrl: (value: string) => {
      (request as any).url = value;
    },
    skip: (reason = "Skipped by script") => {
      state.skipped = true;
      state.skipReason = reason;
    },
    log: (...values: unknown[]) =>
      logs.push(values.map(formatLogValue).join(" ")),
  };
  const consoleShim = { log: invoke.log, warn: invoke.log, error: invoke.log };
  const expect = (actual: unknown) => ({
    toBe(expected: unknown) {
      if (actual !== expected)
        throw new Error(
          `Expected ${formatLogValue(actual)} to be ${formatLogValue(expected)}`,
        );
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(
          `Expected ${formatLogValue(actual)} to equal ${formatLogValue(expected)}`,
        );
    },
    toContain(expected: unknown) {
      if (!String(actual).includes(String(expected)))
        throw new Error(
          `Expected ${formatLogValue(actual)} to contain ${formatLogValue(expected)}`,
        );
    },
    toBeDefined() {
      if (actual === undefined) throw new Error("Expected value to be defined");
    },
    toBeUndefined() {
      if (actual !== undefined)
        throw new Error(`Expected ${formatLogValue(actual)} to be undefined`);
    },
    toBeNull() {
      if (actual !== null)
        throw new Error(`Expected ${formatLogValue(actual)} to be null`);
    },
    toBeTruthy() {
      if (!actual)
        throw new Error(`Expected ${formatLogValue(actual)} to be truthy`);
    },
    toHaveLength(expected: number) {
      const length = (actual as { length?: unknown } | null | undefined)
        ?.length;
      if (length !== expected)
        throw new Error(
          `Expected length ${formatLogValue(length)} to be ${expected}`,
        );
    },
    toMatch(expected: string | RegExp) {
      const pattern =
        typeof expected === "string" ? new RegExp(expected) : expected;
      if (!pattern.test(String(actual ?? "")))
        throw new Error(
          `Expected ${formatLogValue(actual)} to match ${pattern}`,
        );
    },
    toBeGreaterThan(expected: number) {
      if (!(Number(actual) > expected))
        throw new Error(
          `Expected ${formatLogValue(actual)} to be greater than ${expected}`,
        );
    },
    toBeLessThan(expected: number) {
      if (!(Number(actual) < expected))
        throw new Error(
          `Expected ${formatLogValue(actual)} to be less than ${expected}`,
        );
    },
  });
  const test = (name: string, fn: () => unknown) => {
    try {
      fn();
      logs.push(`PASS ${name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Test failed: ${name}: ${message}`);
    }
  };
  const fn = new Function(
    "request",
    "response",
    "variables",
    "invoke",
    "console",
    "expect",
    "test",
    `"use strict"; return (async () => {\n${code}\n})()`,
  );
  return Promise.resolve(
    fn(request, response, variableApi, invoke, consoleShim, expect, test),
  ).then(() => ({
    request,
    variables,
    logs,
    skipped: state.skipped,
    skipReason: state.skipReason,
  }));
}

function upsertKeyValue(target: unknown, key: string, value: string) {
  if (!Array.isArray(target)) return;
  const existing = target.find(
    (item) => item?.key?.toLowerCase() === key.toLowerCase(),
  );
  if (existing) {
    existing.value = value;
    existing.enabled = true;
    return;
  }
  target.push({ key, value, enabled: true });
}

function randomUuid() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `script-${Math.random().toString(36).slice(2)}`
  );
}

function formatLogValue(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function workerSource() {
  return `
    ${formatLogValue.toString()}
    ${upsertKeyValue.toString()}
    const randomUuid = () => self.crypto?.randomUUID?.() ?? "script-" + Math.random().toString(36).slice(2);
    ${executeScript.toString()}
    self.onmessage = async (event) => {
      try {
        const { request, variables, code, response } = event.data;
        const result = await executeScript(request, variables, code, response);
        self.postMessage(result);
      } catch (error) {
        self.postMessage({ error: error instanceof Error ? error.message : String(error) });
      }
    };
  `;
}
