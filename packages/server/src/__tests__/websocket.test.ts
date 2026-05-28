import { expect, it } from "vitest";
import { Effect } from "effect";
import { makeTestClient, makeTestServer, runScoped } from "../test-support/test-server.js";

it("connects WebSocket sessions through the executor service", async () => {
  await runScoped(
    Effect.gen(function* () {
      const server = yield* makeTestServer({
        webSocketConnect: () =>
          Effect.succeed({
            connectionId: "ws-1",
            connected: true,
          }),
      });
      const client = yield* makeTestClient(server);

      const response = yield* client.websocket.connect({
        payload: {
          url: "ws://example.test/socket",
          headers: [],
          protocols: [],
          timeoutMs: 30_000,
          verifySsl: true,
        },
      });
      expect(response).toMatchObject({
        connectionId: "ws-1",
        connected: true,
      });
    }),
  );
});
