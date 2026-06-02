import type { ExecuteResponse, RequestConfig } from "@invoke/core";
import { execute, executeWithRetry } from "./api";

export async function executeWithAPQ(
  request: RequestConfig,
  signal: AbortSignal | undefined,
  queryText: string,
): Promise<ExecuteResponse & { retryAttempts?: number; apqRetried?: boolean }> {
  const hash = await computeQueryHash(queryText);
  const extensions = { persistedQuery: { version: 1, sha256Hash: hash } };

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(request.body) as Record<string, unknown>;
  } catch {
    /* keep empty */
  }

  const { query: _query, ...restFields } = body as {
    query?: string;
    [key: string]: unknown;
  };

  const probe = await execute(
    { ...request, body: JSON.stringify({ ...restFields, extensions }) },
    signal,
  );

  if (!isPersistedQueryNotFound(probe.body)) return probe;

  const result = await executeWithRetry(
    { ...request, body: JSON.stringify({ ...body, extensions }) },
    signal,
  );
  return { ...result, apqRetried: true };
}

async function computeQueryHash(query: string): Promise<string> {
  const data = new TextEncoder().encode(query);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isPersistedQueryNotFound(body: string): boolean {
  try {
    const parsed = JSON.parse(body) as {
      errors?: { extensions?: { code?: string }; message?: string }[];
    };
    return (parsed.errors ?? []).some(
      (error) =>
        error?.extensions?.code === "PERSISTED_QUERY_NOT_FOUND" ||
        error?.message === "PersistedQueryNotFound",
    );
  } catch {
    return false;
  }
}
