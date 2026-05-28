import { expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { MockGrpcStore, MockGrpcStoreLive } from "./mock-grpc-store.js";

const run = <A, E>(effect: Effect.Effect<A, E, MockGrpcStore>) =>
  Effect.runPromise(effect.pipe(Effect.provide(Layer.fresh(MockGrpcStoreLive))));

it("invokes canned responses in sequence and records logs", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* MockGrpcStore;
      yield* store.replaceRoutes([
        {
          fullMethod: "demo.Service/Get",
          enabled: true,
          responses: [
            { bodyJson: '{"n":1}', statusCode: 0, statusMessage: "OK" },
            { bodyJson: '{"n":2}', statusCode: 1, statusMessage: "SECOND" },
          ],
        },
      ]);

      const first = yield* store.invoke("demo.Service/Get", "{}");
      const second = yield* store.invoke("demo.Service/Get", "{}");
      const wrapped = yield* store.invoke("demo.Service/Get", "{}");
      expect(first.bodyJson).toBe('{"n":1}');
      expect(second.bodyJson).toBe('{"n":2}');
      expect(wrapped.bodyJson).toBe('{"n":1}');

      const listed = yield* store.listRoutes();
      expect(listed.routes).toHaveLength(1);
      expect(listed.logs).toHaveLength(3);

      yield* store.clearLogs();
      expect((yield* store.listRoutes()).logs).toHaveLength(0);
    }),
  );
});

it("returns an UNIMPLEMENTED-style response for missing routes", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* MockGrpcStore;
      const result = yield* store.invoke("missing.Service/Get", "{}");
      expect(result.statusCode).toBe(12);
      expect(result.error).toContain("No mock route");
      expect((yield* store.listRoutes()).logs[0].matched).toBe(false);
    }),
  );
});

it("reset clears routes, logs, and sequence state", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* MockGrpcStore;
      yield* store.replaceRoutes([
        {
          fullMethod: "demo.Service/Get",
          responses: [{ bodyJson: "{}", statusCode: 0 }],
        },
      ]);
      yield* store.invoke("demo.Service/Get", "{}");
      yield* store.reset();
      const listed = yield* store.listRoutes();
      expect(listed.routes).toHaveLength(0);
      expect(listed.logs).toHaveLength(0);
    }),
  );
});
