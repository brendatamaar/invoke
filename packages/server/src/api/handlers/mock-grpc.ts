import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { MockGrpcStore } from "../../services/mock-grpc-store.js";
import { InvokeApi } from "../index.js";

export const MockGrpcLive = HttpApiBuilder.group(InvokeApi, "mockGrpc", (handlers) =>
  handlers
    .handle("routes", () =>
      Effect.gen(function* () {
        const store = yield* MockGrpcStore;
        return yield* store.listRoutes();
      }),
    )
    .handle("replaceRoutes", ({ payload }) =>
      Effect.gen(function* () {
        const store = yield* MockGrpcStore;
        return yield* store.replaceRoutes(payload.routes as any);
      }),
    )
    .handle("clearLogs", () =>
      Effect.gen(function* () {
        const store = yield* MockGrpcStore;
        yield* store.clearLogs();
        return { ok: true };
      }),
    )
    .handle("invoke", ({ payload }) =>
      Effect.gen(function* () {
        const store = yield* MockGrpcStore;
        return yield* store.invoke(payload.fullMethod, payload.bodyJson);
      }),
    ),
);
