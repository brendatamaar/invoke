import nodeCrypto from "node:crypto";
import type { Hono } from "hono";
import type { ProxyRecordEntry, ProxyRequestInput } from "../../types/index.js";
import { parseJsonBody } from "../../lib/validate.js";
import { proxyRecordsToMockRoutes } from "../mock/routes.js";
import { proxyRecordsToMocksSchema, proxySchema } from "./schema.js";

const proxyRecords: ProxyRecordEntry[] = [];
const MAX_PROXY_RECORDS = 500;

export function registerProxyRoutes(app: Hono) {
  app.post("/api/proxy/request", async (c) => {
    const parsed = await parseJsonBody(c, proxySchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as ProxyRequestInput;

    const headers: Record<string, string> = {};
    for (const h of input.headers) {
      if (h.enabled !== false && h.key) headers[h.key] = h.value;
    }

    const fetchOptions: RequestInit = {
      method: input.method,
      headers,
    };
    if (input.body && input.method !== "GET" && input.method !== "HEAD") {
      fetchOptions.body = input.body;
    }

    let targetRes: Response;
    try {
      targetRes = await fetch(input.targetUrl, fetchOptions);
    } catch (err) {
      return c.json({ error: `Proxy fetch failed: ${String(err)}` }, 502);
    }

    const MAX_BODY_BYTES = 10 * 1024 * 1024;
    const contentLength = Number(targetRes.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return c.json({ error: "Response body exceeds 10 MB limit" }, 502);
    }

    const responseBody = await targetRes.text();
    if (responseBody.length > MAX_BODY_BYTES) {
      return c.json({ error: "Response body exceeds 10 MB limit" }, 502);
    }

    const responseHeaders: { key: string; value: string }[] = [];
    targetRes.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding", "connection"].includes(key.toLowerCase())) {
        responseHeaders.push({ key, value });
      }
    });

    const url = new URL(input.targetUrl);
    const record: ProxyRecordEntry = {
      id: nodeCrypto.randomUUID(),
      method: input.method,
      path: url.pathname + url.search,
      requestHeaders: input.headers.filter((h) => h.enabled !== false && h.key),
      requestBody: input.body,
      status: targetRes.status,
      responseHeaders,
      responseBody,
      createdAt: Date.now(),
    };
    proxyRecords.unshift(record);
    if (proxyRecords.length > MAX_PROXY_RECORDS) proxyRecords.splice(MAX_PROXY_RECORDS);

    return c.json({
      status: targetRes.status,
      statusText: targetRes.statusText,
      headers: responseHeaders,
      body: responseBody,
      recordId: record.id,
    });
  });

  app.get("/api/proxy/records", (c) => {
    return c.json({ records: proxyRecords });
  });

  app.delete("/api/proxy/records", (c) => {
    proxyRecords.splice(0, proxyRecords.length);
    return c.json({ ok: true });
  });

  app.post("/api/proxy/records/to-mocks", async (c) => {
    const parsed = await parseJsonBody(c, proxyRecordsToMocksSchema);
    if (!parsed.ok) return parsed.response;
    const { ids } = parsed.data;
    const selected = ids ? proxyRecords.filter((r) => ids.includes(r.id)) : proxyRecords;

    return c.json(proxyRecordsToMockRoutes(selected));
  });
}
