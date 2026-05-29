import { expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { OAuth2Store, OAuth2StoreLive } from "./oauth2-store.js";

const run = <A, E>(effect: Effect.Effect<A, E, OAuth2Store>) =>
  Effect.runPromise(effect.pipe(Effect.provide(Layer.fresh(OAuth2StoreLive))));

it("sets, gets, and deletes pending state", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* OAuth2Store;
      yield* store.set("state-a", { status: "pending", timestamp: 1 });
      expect((yield* store.get("state-a"))?.status).toBe("pending");
      yield* store.delete("state-a");
      expect(yield* store.get("state-a")).toBeUndefined();
    }),
  );
});

it("only deletes terminal results when read", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* OAuth2Store;
      yield* store.set("pending", { status: "pending", timestamp: 1 });
      yield* store.set("done", {
        status: "done",
        accessToken: "token",
        timestamp: 2,
      });
      yield* store.set("error", { status: "error", error: "bad", timestamp: 3 });

      expect((yield* store.getAndDeleteIfTerminal("pending"))?.status).toBe("pending");
      expect((yield* store.get("pending"))?.status).toBe("pending");
      expect((yield* store.getAndDeleteIfTerminal("done"))?.status).toBe("done");
      expect(yield* store.get("done")).toBeUndefined();
      expect((yield* store.getAndDeleteIfTerminal("error"))?.status).toBe("error");
      expect(yield* store.get("missing")).toBeUndefined();
    }),
  );
});
