import type { MockRoute } from "@invoke/core";
import { ensureOk, readJson } from "../../lib/http";
import type { ProxyRecord } from "../../types";

export async function proxyRequest(params: {
  targetUrl: string;
  method: string;
  headers: { key: string; value: string; enabled?: boolean }[];
  body: string;
}): Promise<{
  status: number;
  statusText: string;
  headers: { key: string; value: string }[];
  body: string;
  recordId: string;
}> {
  const response = await fetch("/api/proxy/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return readJson<{
    status: number;
    statusText: string;
    headers: { key: string; value: string }[];
    body: string;
    recordId: string;
  }>(response);
}

export async function loadProxyRecords(): Promise<ProxyRecord[]> {
  const response = await fetch("/api/proxy/records");
  const data = await readJson<{ records: ProxyRecord[] }>(response);
  return data.records;
}

export async function clearProxyRecords(): Promise<void> {
  const response = await fetch("/api/proxy/records", { method: "DELETE" });
  await ensureOk(response);
}

export async function proxyRecordsToMocks(
  ids?: string[],
): Promise<{ added: number; routes: MockRoute[] }> {
  const response = await fetch("/api/proxy/records/to-mocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  return readJson<{ added: number; routes: MockRoute[] }>(response);
}
