import nodeCrypto from "node:crypto";
import type { KeyValue } from "@invoke/core";
import type { WebhookValidationConfig, WebhookValidationResult } from "../types/index.js";

export function validateWebhookRequest(
  config: WebhookValidationConfig,
  headers: KeyValue[],
  body: string,
): WebhookValidationResult {
  if (config.type === "none") return { passed: true };

  if (config.type === "header") {
    if (!config.headerName || !config.headerValue) return { passed: true };
    const found = headers.find(
      (header) => header.key.toLowerCase() === config.headerName!.toLowerCase(),
    );
    if (!found) return { passed: false, error: `Missing header: ${config.headerName}` };
    if (found.value !== config.headerValue)
      return { passed: false, error: "Header token mismatch" };
    return { passed: true };
  }

  if (config.type === "hmac") {
    if (!config.secret || !config.signatureHeader) {
      return {
        passed: false,
        error: "HMAC secret or signature header not configured",
      };
    }
    const algorithm = config.algorithm ?? "sha256";
    const sigHeader = headers.find(
      (header) => header.key.toLowerCase() === config.signatureHeader!.toLowerCase(),
    );
    if (!sigHeader) {
      return {
        passed: false,
        error: `Missing signature header: ${config.signatureHeader}`,
      };
    }
    const rawSig = sigHeader.value;
    const prefix = config.signaturePrefix ?? "";
    const receivedHex = prefix && rawSig.startsWith(prefix) ? rawSig.slice(prefix.length) : rawSig;
    const expectedHex = nodeCrypto
      .createHmac(algorithm, config.secret)
      .update(body, "utf8")
      .digest("hex");
    try {
      const passed = nodeCrypto.timingSafeEqual(
        Buffer.from(receivedHex.padEnd(expectedHex.length, "0"), "hex"),
        Buffer.from(expectedHex, "hex"),
      );
      return passed ? { passed: true } : { passed: false, error: "Signature mismatch" };
    } catch {
      return { passed: false, error: "Invalid signature format" };
    }
  }

  return { passed: true };
}
