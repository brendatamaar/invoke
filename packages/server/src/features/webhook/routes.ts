import nodeCrypto from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import type { KeyValue } from "@invoke/core";
import type { Hono } from "hono";
import { z } from "zod";
import type {
  WebhookEntry,
  WebhookValidationConfig,
  WebhookValidationResult,
} from "../../types/index.js";

const webhookLogs = new Map<string, WebhookEntry[]>();
const webhookConfigs = new Map<string, WebhookValidationConfig>();
const MAX_WEBHOOK_ENTRIES = 200;

const webhookValidationSchema = z.object({
  type: z.enum(["none", "hmac", "header"]),
  secret: z.string().optional(),
  algorithm: z.enum(["sha256", "sha1", "sha512"]).optional(),
  signatureHeader: z.string().optional(),
  signaturePrefix: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
});

export function registerWebhookRoutes(app: Hono) {
  app.get("/api/webhook/:id/logs", (c) => {
    const { id: webhookId } = c.req.param();
    return c.json({ entries: webhookLogs.get(webhookId) ?? [] });
  });

  app.delete("/api/webhook/:id/logs", (c) => {
    const { id: webhookId } = c.req.param();
    webhookLogs.delete(webhookId);
    return c.json({ ok: true });
  });

  app.put(
    "/api/webhook/:id/config",
    zValidator("json", webhookValidationSchema),
    (c) => {
      const { id: webhookId } = c.req.param();
      const config = c.req.valid("json") as WebhookValidationConfig;
      webhookConfigs.set(webhookId, config);
      return c.json({ ok: true });
    },
  );

  app.delete("/api/webhook/:id", (c) => {
    const { id: webhookId } = c.req.param();
    webhookLogs.delete(webhookId);
    webhookConfigs.delete(webhookId);
    return c.json({ ok: true });
  });

  app.all("/webhook/:id", async (c) => {
    const { id: webhookId } = c.req.param();
    const body = await c.req.text();
    const headers = requestHeaders(c.req.raw.headers);
    const config = webhookConfigs.get(webhookId) ?? { type: "none" as const };
    const validation = validateWebhookRequest(config, headers, body);
    const entry: WebhookEntry = {
      id: nodeCrypto.randomUUID(),
      method: c.req.method.toUpperCase(),
      headers,
      body,
      createdAt: Date.now(),
      validationPassed: validation.passed,
      validationError: validation.error,
    };
    const existing = webhookLogs.get(webhookId) ?? [];
    existing.unshift(entry);
    if (existing.length > MAX_WEBHOOK_ENTRIES)
      existing.length = MAX_WEBHOOK_ENTRIES;
    webhookLogs.set(webhookId, existing);
    return c.json({ ok: true, validationPassed: validation.passed });
  });
}

function validateWebhookRequest(
  config: WebhookValidationConfig,
  headers: KeyValue[],
  body: string,
): WebhookValidationResult {
  if (config.type === "none") return { passed: true };

  if (config.type === "header") {
    if (!config.headerName || !config.headerValue) return { passed: true };
    const found = headers.find(
      (h) => h.key.toLowerCase() === config.headerName!.toLowerCase(),
    );
    if (!found)
      return { passed: false, error: `Missing header: ${config.headerName}` };
    if (found.value !== config.headerValue)
      return { passed: false, error: "Header token mismatch" };
    return { passed: true };
  }

  if (config.type === "hmac") {
    if (!config.secret || !config.signatureHeader)
      return {
        passed: false,
        error: "HMAC secret or signature header not configured",
      };
    const algorithm = config.algorithm ?? "sha256";
    const sigHeader = headers.find(
      (h) => h.key.toLowerCase() === config.signatureHeader!.toLowerCase(),
    );
    if (!sigHeader)
      return {
        passed: false,
        error: `Missing signature header: ${config.signatureHeader}`,
      };
    const rawSig = sigHeader.value;
    const prefix = config.signaturePrefix ?? "";
    const receivedHex =
      prefix && rawSig.startsWith(prefix)
        ? rawSig.slice(prefix.length)
        : rawSig;
    const expectedHex = nodeCrypto
      .createHmac(algorithm, config.secret)
      .update(body, "utf8")
      .digest("hex");
    try {
      const passed = nodeCrypto.timingSafeEqual(
        Buffer.from(receivedHex.padEnd(expectedHex.length, "0"), "hex"),
        Buffer.from(expectedHex, "hex"),
      );
      return passed
        ? { passed: true }
        : { passed: false, error: "Signature mismatch" };
    } catch {
      return { passed: false, error: "Invalid signature format" };
    }
  }

  return { passed: true };
}

function requestHeaders(headers: Headers): KeyValue[] {
  return [...headers.entries()].map(([key, value]) => ({
    key,
    value,
    enabled: true,
  }));
}
