import { ensureOk, readJson } from "../../lib/http";
import type { WebhookEntry, WebhookValidationConfig } from "../../types";

export async function loadWebhookLogs(
  webhookId: string,
): Promise<WebhookEntry[]> {
  const response = await fetch(`/api/webhook/${webhookId}/logs`);
  const data = await readJson<{ entries: WebhookEntry[] }>(response);
  return data.entries;
}

export async function clearWebhookLogs(webhookId: string): Promise<void> {
  const response = await fetch(`/api/webhook/${webhookId}/logs`, {
    method: "DELETE",
  });
  await ensureOk(response);
}

export async function setWebhookConfig(
  webhookId: string,
  config: WebhookValidationConfig,
): Promise<void> {
  const response = await fetch(`/api/webhook/${webhookId}/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  await ensureOk(response);
}

export async function deleteWebhookEndpoint(webhookId: string): Promise<void> {
  const response = await fetch(`/api/webhook/${webhookId}`, {
    method: "DELETE",
  });
  await ensureOk(response);
}
