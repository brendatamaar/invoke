import nodeCrypto from "node:crypto";
import { Schema } from "effect";
import type { KeyValue } from "@invoke/core";
import type { Hono } from "hono";
import { parseJsonBody } from "../../lib/validate.js";
import type {
  WebhookEntry,
  WebhookValidationConfig,
  WebhookValidationResult,
} from "../../types/index.js";

const webhookLogs = new Map<string, WebhookEntry[]>();
const webhookConfigs = new Map<string, WebhookValidationConfig>();
const MAX_WEBHOOK_ENTRIES = 200;

const webhookValidationSchema = Schema.Struct({
  type: Schema.Literal("none", "hmac", "header"),
  secret: Schema.optional(Schema.String),
  algorithm: Schema.optional(Schema.Literal("sha256", "sha1", "sha512")),
  signatureHeader: Schema.optional(Schema.String),
  signaturePrefix: Schema.optional(Schema.String),
  headerName: Schema.optional(Schema.String),
  headerValue: Schema.optional(Schema.String),
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

  app.put("/api/webhook/:id/config", async (c) => {
    const parsed = await parseJsonBody(c, webhookValidationSchema);
    if (!parsed.ok) return parsed.response;
    const { id: webhookId } = c.req.param();
    const config = parsed.data as WebhookValidationConfig;
    webhookConfigs.set(webhookId, config);
    return c.json({ ok: true });
  });

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
