import type { MockRoute } from "@invoke/core";
import { expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { renderMockTemplate } from "./mock-match.js";
import { MockStore, MockStoreLive } from "./mock-store.js";

const run = <A, E>(effect: Effect.Effect<A, E, MockStore>) =>
  Effect.runPromise(effect.pipe(Effect.provide(Layer.fresh(MockStoreLive))));

it("matches routes with path params and request conditions", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* MockStore;
      const route: MockRoute = {
        id: "users",
        enabled: true,
        method: "POST",
        pathPattern: "/users/:id",
        status: 202,
        headers: [],
        body: "user={{param.id}} plan={{query.plan}}",
        conditions: [
          {
            source: "header",
            expression: "x-mode",
            matcher: "equals",
            expected: "test",
          },
          {
            source: "query",
            expression: "plan",
            matcher: "equals",
            expected: "pro",
          },
          {
            source: "bodyJsonPath",
            expression: "$.tier",
            matcher: "equals",
            expected: "gold",
          },
        ],
      };

      const replaced = yield* store.replaceRoutes([route]);
      expect(replaced.count).toBe(1);

      const query = new URLSearchParams("plan=pro");
      const matched = yield* store.findMatch(
        "POST",
        "/users/42",
        [{ key: "x-mode", value: "test", enabled: true }],
        query,
        '{"tier":"gold"}',
      );
      expect(matched?.route.id).toBe("users");
      expect(matched?.params).toEqual({ id: "42" });
      expect(renderMockTemplate(route.body, matched?.params ?? {}, query)).toBe("user=42 plan=pro");

      const miss = yield* store.findMatch(
        "POST",
        "/users/42",
        [{ key: "x-mode", value: "test", enabled: true }],
        new URLSearchParams("plan=free"),
        '{"tier":"gold"}',
      );
      expect(miss).toBeNull();
    }),
  );
});

it("cycles response sequences and resets them on replace", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* MockStore;
      const route: MockRoute = {
        id: "sequence",
        enabled: true,
        method: "GET",
        pathPattern: "/sequence",
        status: 200,
        headers: [],
        body: "base",
        sequences: [
          { status: 200, headers: [], body: "first" },
          { status: 201, headers: [], body: "second" },
        ],
      };

      yield* store.replaceRoutes([route]);
      expect((yield* store.nextSequenceItem(route)).body).toBe("first");
      expect((yield* store.nextSequenceItem(route)).body).toBe("second");
      expect((yield* store.nextSequenceItem(route)).body).toBe("first");

      yield* store.replaceRoutes([route]);
      expect((yield* store.nextSequenceItem(route)).body).toBe("first");
    }),
  );
});

it("tracks logs and imports proxy records as mock routes", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* MockStore;
      yield* store.appendLog({
        matched: false,
        method: "GET",
        path: "/missing",
        status: 404,
        headers: [],
        body: "",
      });
      expect((yield* store.listRoutes()).totalLogs).toBe(1);
      yield* store.clearLogs();
      expect((yield* store.listRoutes()).totalLogs).toBe(0);

      yield* store.replaceRoutes([
        {
          id: "old",
          enabled: true,
          method: "GET",
          pathPattern: "/users",
          status: 200,
          headers: [],
          body: "old",
        },
      ]);
      const imported = yield* store.proxyImport([
        {
          id: "record",
          method: "GET",
          path: "/users?plan=pro",
          status: 201,
          responseHeaders: [{ key: "x-proxy", value: "1" }],
          responseBody: "proxy",
        },
      ]);

      expect(imported.added).toBe(1);
      expect(imported.routes).toHaveLength(1);
      expect(imported.routes[0].pathPattern).toBe("/users");
      expect(imported.routes[0].body).toBe("proxy");
    }),
  );
});
