import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { WebhookStore } from "../../services/webhook-store.js";
import { InvokeApi } from "../index.js";

export const WebhookLive = HttpApiBuilder.group(InvokeApi, "webhook", (handlers) =>
  handlers
    .handle("logs", ({ path }) =>
      Effect.gen(function* () {
        const store = yield* WebhookStore;
        return { entries: yield* store.getLogs(path.id) };
      }),
    )
    .handle("clearLogs", ({ path }) =>
      Effect.gen(function* () {
        const store = yield* WebhookStore;
        yield* store.clearLogs(path.id);
        return { ok: true };
      }),
    )
    .handle("config", ({ path, payload }) =>
      Effect.gen(function* () {
        const store = yield* WebhookStore;
        yield* store.setConfig(path.id, payload);
        return { ok: true };
      }),
    )
    .handle("deleteWebhook", ({ path }) =>
      Effect.gen(function* () {
        const store = yield* WebhookStore;
        yield* store.deleteWebhook(path.id);
        return { ok: true };
      }),
    ),
);
