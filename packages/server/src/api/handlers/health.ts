import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { GrpcExecutor } from "../../services/grpc-executor.js";
import { InvokeApi } from "../index.js";

export const HealthLive = HttpApiBuilder.group(InvokeApi, "health", (handlers) =>
  handlers
    .handle("health", () => Effect.succeed({ ok: true }))
    .handle("ping", () =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        return yield* executor.ping();
      }),
    ),
);
