import type { MockLogEntry, MockRoute } from "@invoke/core";
import { ensureOk, readJson } from "../../lib/http";

export async function loadMockRoutes(): Promise<{
  routes: MockRoute[];
  logs: MockLogEntry[];
  totalLogs: number;
}> {
  const response = await fetch("/api/mock/routes");
  return readJson<{ routes: MockRoute[]; logs: MockLogEntry[]; totalLogs: number }>(response);
}

export async function syncMockRoutes(
  routes: MockRoute[],
): Promise<{ routes: MockRoute[]; count: number }> {
  const response = await fetch("/api/mock/routes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routes }),
  });
  return readJson<{ routes: MockRoute[]; count: number }>(response);
}

export async function clearMockLogs() {
  const response = await fetch("/api/mock/logs", { method: "DELETE" });
  await ensureOk(response);
}
