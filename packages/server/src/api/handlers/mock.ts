import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { MockStore } from "../../services/mock-store.js";
import { InvokeApi } from "../index.js";

export const MockLive = HttpApiBuilder.group(InvokeApi, "mock", (handlers) =>
  handlers
    .handle("routes", () =>
      Effect.gen(function* () {
        const store = yield* MockStore;
        return yield* store.listRoutes();
      }),
    )
    .handle("replaceRoutes", ({ payload }) =>
      Effect.gen(function* () {
        const store = yield* MockStore;
        return yield* store.replaceRoutes(payload.routes as any);
      }),
    )
    .handle("clearLogs", () =>
      Effect.gen(function* () {
        const store = yield* MockStore;
        yield* store.clearLogs();
        return { ok: true };
      }),
    ),
);
