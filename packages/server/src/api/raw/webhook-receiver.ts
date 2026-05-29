import type { KeyValue } from "@invoke/core";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import { validateWebhookRequest } from "../../services/webhook-validator.js";
import { WebhookStore } from "../../services/webhook-store.js";

const requestHeaders = (headers: Record<string, string>): KeyValue[] =>
  Object.entries(headers).map(([key, value]) => ({
    key,
    value,
    enabled: true,
  }));

export const webhookReceiver = Effect.gen(function* () {
  const params = yield* HttpRouter.params;
  const webhookId = params.id;
  if (!webhookId) {
    return HttpServerResponse.unsafeJson({ error: "webhook id is required" }, { status: 400 });
  }

  const request = yield* HttpServerRequest.HttpServerRequest;
  const body = yield* request.text;
  const headers = requestHeaders(request.headers as Record<string, string>);
  const store = yield* WebhookStore;
  const config = (yield* store.getConfig(webhookId)) ?? { type: "none" as const };
  const validation = validateWebhookRequest(config, headers, body);

  yield* store.appendEntry(webhookId, {
    id: crypto.randomUUID(),
    method: request.method.toUpperCase(),
    headers,
    body,
    createdAt: Date.now(),
    validationPassed: validation.passed,
    validationError: validation.error,
  });

  return HttpServerResponse.unsafeJson({
    ok: true,
    validationPassed: validation.passed,
  });
});
