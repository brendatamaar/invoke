import { runAssertions } from "./assertions";
import { extractVariables, resolveRequest } from "./variables";
import type {
  AssertionResult,
  BatchRunConfig,
  BatchRunStats,
  CollectionRunResult,
  ExecuteResponse,
  RequestConfig,
  RequestRunResult,
  SavedRequest,
  VariableScope,
} from "./types";

export interface CollectionRunnerOptions {
  execute: (request: RequestConfig) => Promise<ExecuteResponse>;
  scopes?: VariableScope[];
  stopOnFailure?: boolean;
  onRequestStart?: (req: SavedRequest, index: number) => void;
  onRequestComplete?: (result: RequestRunResult, index: number) => void;
}

export class CollectionRunner {
  private cancelled = false;

  cancel() {
    this.cancelled = true;
  }

  async run(
    requests: SavedRequest[],
    options: CollectionRunnerOptions,
    meta: { id: string; name: string; collectionId?: string; folderId?: string },
  ): Promise<CollectionRunResult> {
    const startedAt = Date.now();
    const results: RequestRunResult[] = [];
    let variables: Record<string, string> = {};

    for (let i = 0; i < requests.length; i++) {
      if (this.cancelled) break;

      const saved = requests[i];
      options.onRequestStart?.(saved, i);

      const req = saved.request as RequestConfig;
      const method = (req as RequestConfig).method ?? "GET";
      const url = (req as RequestConfig).url ?? "";

      const runResult: RequestRunResult = {
        requestId: saved.id,
        name: saved.name || url,
        method,
        url,
        status: "skipped",
        durationMs: 0,
      };

      try {
        const scopes: VariableScope[] = [
          ...(options.scopes ?? []),
          { name: "runner", variables: Object.entries(variables).map(([key, value]) => ({ key, value, enabled: true })) },
        ];
        const { request: resolved } = resolveRequest(req, scopes);
        const t0 = Date.now();
        const response = await options.execute(resolved);
        runResult.durationMs = Date.now() - t0;
        runResult.response = response;

        const assertions: AssertionResult[] = runAssertions(
          response,
          (req.assertions ?? []).filter((a) => a.enabled !== false),
        );
        runResult.assertions = assertions;

        const extracted = extractVariables(response, req.extractionRules ?? []);
        variables = { ...variables, ...extracted };

        const assertionFailed = assertions.some((a) => !a.passed);
        runResult.status =
          response.error || assertionFailed ? "failed" : "passed";
      } catch (e) {
        runResult.status = "error";
        runResult.error = String(e);
      }

      results.push(runResult);
      options.onRequestComplete?.(runResult, i);

      if (
        options.stopOnFailure &&
        (runResult.status === "failed" || runResult.status === "error")
      ) {
        break;
      }
    }

    const completedAt = Date.now();
    const passedCount = results.filter((r) => r.status === "passed").length;
    const failedCount = results.filter(
      (r) => r.status === "failed" || r.status === "error",
    ).length;
    const overallStatus: CollectionRunResult["status"] = this.cancelled
      ? "cancelled"
      : failedCount > 0
        ? "failed"
        : "passed";

    return {
      ...meta,
      startedAt,
      completedAt,
      status: overallStatus,
      results,
      passedCount,
      failedCount,
    };
  }
}

export function exportRunResultJson(result: CollectionRunResult): string {
  return JSON.stringify(result, null, 2);
}

export function exportRunResultCsv(result: CollectionRunResult): string {
  const header = "Name,Method,URL,Status,Duration(ms),Assertions Passed,Assertions Failed,Error";
  const rows = result.results.map((r) => {
    const assertPassed = r.assertions?.filter((a) => a.passed).length ?? 0;
    const assertFailed = r.assertions?.filter((a) => !a.passed).length ?? 0;
    return [
      csvEscape(r.name),
      r.method,
      csvEscape(r.url),
      r.status,
      r.durationMs,
      assertPassed,
      assertFailed,
      csvEscape(r.error ?? ""),
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export class BatchRunner {
  private cancelled = false;

  cancel() {
    this.cancelled = true;
  }

  async run(
    request: RequestConfig,
    execute: (req: RequestConfig) => Promise<ExecuteResponse>,
    config: BatchRunConfig,
    onProgress?: (done: number, total: number) => void,
  ): Promise<BatchRunStats> {
    const { iterations, concurrency, delayMs, stopOnFailure } = config;
    const durations: number[] = [];
    const statusCounts: Record<number, number> = {};
    const errors: string[] = [];
    let passed = 0;
    let failed = 0;
    let done = 0;

    this.cancelled = false;

    for (let i = 0; i < iterations; i += concurrency) {
      if (this.cancelled) break;

      const batch = Math.min(concurrency, iterations - i);
      const promises = Array.from({ length: batch }, async () => {
        if (this.cancelled) return;
        const t0 = Date.now();
        try {
          const res = await execute(request);
          const durationMs = Date.now() - t0;
          durations.push(durationMs);
          statusCounts[res.status] = (statusCounts[res.status] ?? 0) + 1;
          if (res.error || res.status >= 500) {
            failed++;
            if (res.error) errors.push(res.error);
          } else {
            passed++;
          }
        } catch (e) {
          durations.push(Date.now() - t0);
          failed++;
          errors.push(String(e));
        }
      });

      await Promise.all(promises);
      done += batch;
      onProgress?.(done, iterations);

      if (stopOnFailure && failed > 0) break;

      if (delayMs > 0 && i + batch < iterations) {
        await sleep(delayMs);
      }
    }

    return computeBatchStats(durations, passed, failed, statusCounts, errors);
  }
}

export function computeBatchStats(
  durations: number[],
  passed: number,
  failed: number,
  statusCounts: Record<number, number>,
  errors: string[],
): BatchRunStats {
  const total = durations.length;
  if (total === 0) {
    return {
      total: 0, passed, failed, statusCounts, errors,
      minMs: 0, maxMs: 0, meanMs: 0,
      p50Ms: 0, p95Ms: 0, p99Ms: 0,
    };
  }
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    total,
    passed,
    failed,
    statusCounts,
    errors: errors.slice(0, 20),
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    meanMs: Math.round(sum / total),
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
  };
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
