import nodeCrypto from "node:crypto";
import { expect, it } from "vitest";
import { Effect, Layer } from "effect";
import type { WebhookEntry } from "../types/index.js";
import { validateWebhookRequest } from "./webhook-validator.js";
import { WebhookStore, WebhookStoreLive } from "./webhook-store.js";

const run = <A, E>(effect: Effect.Effect<A, E, WebhookStore>) =>
  Effect.runPromise(effect.pipe(Effect.provide(Layer.fresh(WebhookStoreLive))));

const entry = (id: string): WebhookEntry => ({
  id,
  method: "POST",
  headers: [],
  body: id,
  createdAt: Date.now(),
  validationPassed: true,
});

it("stores configs and caps webhook logs at 200 entries", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* WebhookStore;
      yield* store.setConfig("stripe", {
        type: "header",
        headerName: "x-token",
        headerValue: "secret",
      });
      expect((yield* store.getConfig("stripe"))?.type).toBe("header");

      for (let index = 0; index < 201; index += 1) {
        yield* store.appendEntry("stripe", entry(String(index)));
      }
      const logs = yield* store.getLogs("stripe");
      expect(logs).toHaveLength(200);
      expect(logs[0].id).toBe("200");
      expect(logs.some((item) => item.id === "0")).toBe(false);

      yield* store.clearLogs("stripe");
      expect(yield* store.getLogs("stripe")).toHaveLength(0);
      expect((yield* store.getConfig("stripe"))?.type).toBe("header");
      yield* store.deleteWebhook("stripe");
      expect(yield* store.getConfig("stripe")).toBeUndefined();
    }),
  );
});

it("validates header-token and hmac webhook requests", () => {
  expect(
    validateWebhookRequest(
      { type: "header", headerName: "x-token", headerValue: "secret" },
      [{ key: "X-Token", value: "secret" }],
      "",
    ),
  ).toEqual({ passed: true });
  expect(
    validateWebhookRequest(
      { type: "header", headerName: "x-token", headerValue: "secret" },
      [{ key: "x-token", value: "wrong" }],
      "",
    ),
  ).toEqual({ passed: false, error: "Header token mismatch" });

  const body = '{"event":"ok"}';
  const signature = nodeCrypto.createHmac("sha256", "topsecret").update(body, "utf8").digest("hex");
  expect(
    validateWebhookRequest(
      {
        type: "hmac",
        secret: "topsecret",
        signatureHeader: "x-signature",
        signaturePrefix: "sha256=",
      },
      [{ key: "x-signature", value: `sha256=${signature}` }],
      body,
    ),
  ).toEqual({ passed: true });
  expect(
    validateWebhookRequest(
      {
        type: "hmac",
        secret: "topsecret",
        signatureHeader: "x-signature",
      },
      [{ key: "x-signature", value: "bad" }],
      body,
    ).passed,
  ).toBe(false);
});
