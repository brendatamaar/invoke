import { expect, it } from "vitest";
import { Effect } from "effect";
import {
  makeTestClient,
  makeTestServer,
  runScoped,
  withGlobalFetch,
} from "../test-support/test-server.js";

it("proxies requests and stores records", async () => {
  await runScoped(
    withGlobalFetch(
      async () =>
        new Response("proxy response", {
          status: 201,
          statusText: "Created",
          headers: {
            "content-type": "text/plain",
            "x-proxy-test": "yes",
          },
        }),
    )(
      Effect.gen(function* () {
        const server = yield* makeTestServer();
        const client = yield* makeTestClient(server);

        yield* client.proxy.clearRecords({});
        const proxied = yield* client.proxy.request({
          payload: {
            targetUrl: "http://target.test/users?plan=pro",
            method: "POST",
            headers: [{ key: "x-request", value: "1", enabled: true }],
            body: "hello",
          },
        });
        expect(proxied).toMatchObject({
          status: 201,
          statusText: "Created",
          body: "proxy response",
        });

        const records = (yield* client.proxy.records({})) as any;
        expect(records.records).toHaveLength(1);
        expect(records.records[0]).toMatchObject({
          method: "POST",
          path: "/users?plan=pro",
          status: 201,
          responseBody: "proxy response",
        });
      }),
    ),
  );
});
