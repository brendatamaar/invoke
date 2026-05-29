import { expect, it } from "vitest";
import { Effect } from "effect";
import { makeTestClient, makeTestServer, runScoped } from "../test-support/test-server.js";

it("serves canned gRPC mock responses", async () => {
  await runScoped(
    Effect.gen(function* () {
      const server = yield* makeTestServer();
      const client = yield* makeTestClient(server);

      yield* client.mockGrpc.replaceRoutes({
        payload: {
          routes: [
            {
              fullMethod: "test.Service/Hello",
              responses: [
                {
                  bodyJson: '{"message":"hello from mock"}',
                  statusCode: 0,
                  statusMessage: "OK",
                  trailers: [],
                },
              ],
              enabled: true,
            },
          ],
        },
      });

      const response = yield* client.mockGrpc.invoke({
        payload: {
          fullMethod: "test.Service/Hello",
          bodyJson: '{"name":"world"}',
        },
      });
      expect(response).toMatchObject({
        bodyJson: '{"message":"hello from mock"}',
        statusCode: 0,
        statusMessage: "OK",
      });
    }),
  );
});
