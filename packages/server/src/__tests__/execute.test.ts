import { expect, it } from "vitest";
import { Effect } from "effect";
import { makeTestClient, makeTestServer, runScoped } from "../test-support/test-server.js";

it("executes a resolved HTTP request through the executor service", async () => {
  await runScoped(
    Effect.gen(function* () {
      const server = yield* makeTestServer({
        execute: () =>
          Effect.succeed({
            status: 204,
            statusText: "No Content",
            headers: [],
            body: "",
            timing: {},
          }),
      });
      const client = yield* makeTestClient(server);

      const response = yield* client.execute.execute({
        payload: {
          method: "GET",
          url: "http://target.test/health",
          headers: [],
          body: "",
          timeoutMs: 30_000,
          followRedirects: true,
          maxRedirects: 10,
          verifySsl: true,
          httpVersion: "auto" as const,
          allowPrivateAddresses: true,
        },
      });
      expect(response).toMatchObject({
        status: 204,
        statusText: "No Content",
        body: "",
        bodyEncoding: "utf8",
      });
    }),
  );
});
