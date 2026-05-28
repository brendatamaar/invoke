import { expect, it } from "vitest";
import { Effect } from "effect";
import { makeTestClient, makeTestServer, runScoped } from "../test-support/test-server.js";

it("serves health and executor ping through the typed API", async () => {
  await runScoped(
    Effect.gen(function* () {
      const server = yield* makeTestServer();
      const client = yield* makeTestClient(server);

      expect(yield* client.health.health({})).toEqual({ ok: true });
      expect(yield* client.health.ping({})).toMatchObject({
        message: "pong from test",
        version: "test",
      });
    }),
  );
});
