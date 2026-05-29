import { expect, it } from "vitest";
import { Effect } from "effect";
import { makeTestClient, makeTestServer, runScoped } from "../test-support/test-server.js";

it("reflects gRPC services through the executor service", async () => {
  await runScoped(
    Effect.gen(function* () {
      const server = yield* makeTestServer({
        grpcReflect: () =>
          Effect.succeed({
            services: [
              {
                name: "test.Service",
                methods: [{ name: "Ping", inputType: "PingRequest" }],
              },
            ],
          }),
      });
      const client = yield* makeTestClient(server);

      const response = yield* client.grpc.reflect({
        payload: {
          address: "127.0.0.1:50051",
          tls: false,
          timeoutMs: 30_000,
          metadata: [],
          verifySsl: true,
          allowPrivateAddresses: true,
        },
      });
      expect(response).toMatchObject({
        services: [{ name: "test.Service" }],
      });
    }),
  );
});
