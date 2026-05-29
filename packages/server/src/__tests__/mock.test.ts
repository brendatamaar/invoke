import { expect, it } from "vitest";
import { Effect } from "effect";
import { makeTestClient, makeTestServer, runScoped } from "../test-support/test-server.js";

it("matches mock routes with conditions before fallback", async () => {
  await runScoped(
    Effect.gen(function* () {
      const server = yield* makeTestServer();
      const client = yield* makeTestClient(server);

      yield* client.mock.replaceRoutes({
        payload: {
          routes: [
            {
              id: "conditional",
              enabled: true,
              method: "POST",
              pathPattern: "/users/:id",
              status: 202,
              headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
              body: '{ "matched": true, "id": "{{param.id}}", "plan": "{{query.plan}}" }',
              conditions: [
                {
                  source: "header",
                  expression: "x-mode",
                  matcher: "equals",
                  expected: "pro",
                },
                {
                  source: "query",
                  expression: "plan",
                  matcher: "equals",
                  expected: "pro",
                },
                {
                  source: "bodyJsonPath",
                  expression: "$.role",
                  matcher: "equals",
                  expected: "admin",
                },
              ],
            },
            {
              id: "fallback",
              enabled: true,
              method: "POST",
              pathPattern: "/users/:id",
              status: 200,
              headers: [],
              body: "fallback",
            },
          ],
        },
      });

      const matched = yield* Effect.promise(() =>
        server.fetch(
          new Request("http://localhost/mock/users/42?plan=pro", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-mode": "pro",
            },
            body: JSON.stringify({ role: "admin" }),
          }),
        ),
      );
      expect(matched.status).toBe(202);
      expect(yield* Effect.promise(() => matched.json())).toMatchObject({
        matched: true,
        id: "42",
        plan: "pro",
      });

      const fallback = yield* Effect.promise(() =>
        server.fetch(
          new Request("http://localhost/mock/users/42?plan=free", {
            method: "POST",
            headers: { "x-mode": "pro" },
            body: JSON.stringify({ role: "admin" }),
          }),
        ),
      );
      expect(fallback.status).toBe(200);
      expect(yield* Effect.promise(() => fallback.text())).toBe("fallback");
    }),
  );
});

it("cycles response sequences and resets them when routes change", async () => {
  await runScoped(
    Effect.gen(function* () {
      const server = yield* makeTestServer();
      const client = yield* makeTestClient(server);
      const route = {
        id: "sequence",
        enabled: true,
        method: "GET" as const,
        pathPattern: "/sequence",
        status: 200,
        headers: [],
        body: "default",
        sequences: [
          { status: 200, headers: [], body: "first" },
          { status: 201, headers: [], body: "second" },
        ],
      };

      yield* client.mock.replaceRoutes({ payload: { routes: [route] } });

      const first = yield* Effect.promise(() => server.fetch("http://localhost/mock/sequence"));
      expect(first.status).toBe(200);
      expect(yield* Effect.promise(() => first.text())).toBe("first");

      const second = yield* Effect.promise(() => server.fetch("http://localhost/mock/sequence"));
      expect(second.status).toBe(201);
      expect(yield* Effect.promise(() => second.text())).toBe("second");

      yield* client.mock.replaceRoutes({ payload: { routes: [route] } });
      const reset = yield* Effect.promise(() => server.fetch("http://localhost/mock/sequence"));
      expect(reset.status).toBe(200);
      expect(yield* Effect.promise(() => reset.text())).toBe("first");
    }),
  );
});
