import { expect, it } from "vitest";
import { Effect } from "effect";
import { makeTestClient, makeTestServer, runScoped } from "../test-support/test-server.js";

it("captures webhook receiver logs and clears them", async () => {
  await runScoped(
    Effect.gen(function* () {
      const server = yield* makeTestServer();
      const client = yield* makeTestClient(server);
      const webhookId = "webhook-test";

      yield* client.webhook.clearLogs({ path: { id: webhookId } });

      const received = yield* Effect.promise(() =>
        server.fetch(
          new Request(`http://localhost/webhook/${webhookId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Test": "yes",
            },
            body: JSON.stringify({ ok: true }),
          }),
        ),
      );
      expect(received.status).toBe(200);
      expect(yield* Effect.promise(() => received.json())).toMatchObject({
        ok: true,
        validationPassed: true,
      });

      const logs = (yield* client.webhook.logs({
        path: { id: webhookId },
      })) as any;
      expect(logs.entries).toHaveLength(1);
      expect(logs.entries[0]).toMatchObject({
        method: "POST",
        body: '{"ok":true}',
        validationPassed: true,
      });
      expect(
        logs.entries[0].headers.some(
          (header: any) => header.key.toLowerCase() === "x-webhook-test" && header.value === "yes",
        ),
      ).toBe(true);

      yield* client.webhook.clearLogs({ path: { id: webhookId } });
      const cleared = (yield* client.webhook.logs({
        path: { id: webhookId },
      })) as any;
      expect(cleared.entries).toEqual([]);
    }),
  );
});
