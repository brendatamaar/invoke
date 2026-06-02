import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Effect, Stream } from "effect";
import type { ExecuteInput } from "../../types/index.js";
import { executeDigest } from "../../features/execute/digest-auth.js";
import { executePayload } from "../../features/execute/payload.js";
import { bytesFrom, normalizeResponse } from "../../features/execute/response.js";
import { GrpcExecutor } from "../../services/grpc-executor.js";
import { SsrfGuard } from "../../services/ssrf-guard.js";
import { InvokeApi } from "../index.js";
import { sseEvent, sseResponse } from "./sse.js";

function executeErrorResponse(error: unknown) {
  return normalizeResponse({
    error: String((error as any)?.message ?? error),
    body: Buffer.alloc(0),
    headers: [],
    timing: {},
  });
}

function formatExecuteChunk(chunk: any) {
  const events: string[] = [];
  const bytes = bytesFrom(chunk.body);
  if (bytes.length > 0) {
    events.push(
      sseEvent("chunk", {
        chunk: bytes.toString("base64"),
        encoding: "base64",
      }),
    );
  }
  if (chunk.finalResponse) {
    events.push(sseEvent("final", normalizeResponse(chunk.finalResponse)));
  }
  return events;
}

export const ExecuteLive = HttpApiBuilder.group(InvokeApi, "execute", (handlers) =>
  handlers
    .handle("execute", ({ payload }) =>
      Effect.gen(function* () {
        const input = payload as ExecuteInput;
        const guard = yield* SsrfGuard;
        const ssrf = yield* guard.check(input.url).pipe(Effect.either);
        if (ssrf._tag === "Left") {
          return HttpServerResponse.unsafeJson({ error: ssrf.left.reason }, { status: 403 });
        }
        const executor = yield* GrpcExecutor;
        const raw =
          input.auth?.type === "digest"
            ? yield* Effect.tryPromise(() => executeDigest(input)).pipe(Effect.either)
            : yield* executor.execute(executePayload(input)).pipe(Effect.either);

        if (raw._tag === "Left") return executeErrorResponse(raw.left);
        return normalizeResponse(raw.right);
      }),
    )
    .handle("stream", ({ payload }) =>
      Effect.gen(function* () {
        const guard = yield* SsrfGuard;
        const input = payload as ExecuteInput;
        const ssrf = yield* guard.check(input.url).pipe(Effect.either);
        if (ssrf._tag === "Left") {
          return sseResponse(
            Stream.succeed(sseEvent("final", { error: ssrf.left.reason, status: 403 })),
          );
        }
        const executor = yield* GrpcExecutor;
        const stream = executor.executeStream(executePayload(input)).pipe(
          Stream.flatMap((chunk) => Stream.fromIterable(formatExecuteChunk(chunk))),
          Stream.catchAll((error) =>
            Stream.succeed(sseEvent("final", executeErrorResponse(error))),
          ),
        );
        return sseResponse(stream);
      }),
    ),
);
