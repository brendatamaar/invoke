import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { MockGrpcRecorder } from "../../services/mock-grpc-recorder.js";
import { InvokeApi } from "../index.js";

export const MockGrpcRecordLive = HttpApiBuilder.group(InvokeApi, "mockGrpcRecord", (handlers) =>
  handlers
    .handle("start", ({ payload }) =>
      Effect.gen(function* () {
        const recorder = yield* MockGrpcRecorder;
        return yield* recorder.start(payload.name, payload.address);
      }),
    )
    .handle("stop", () =>
      Effect.gen(function* () {
        const recorder = yield* MockGrpcRecorder;
        return yield* recorder.stop();
      }),
    )
    .handle("status", () =>
      Effect.gen(function* () {
        const recorder = yield* MockGrpcRecorder;
        return yield* recorder.status();
      }),
    )
    .handle("fixtures", () =>
      Effect.gen(function* () {
        const recorder = yield* MockGrpcRecorder;
        return { fixtures: yield* recorder.listFixtures() };
      }),
    )
    .handle("fixture", ({ path }) =>
      Effect.gen(function* () {
        const recorder = yield* MockGrpcRecorder;
        return yield* recorder.getFixture(path.id);
      }),
    )
    .handle("deleteFixture", ({ path }) =>
      Effect.gen(function* () {
        const recorder = yield* MockGrpcRecorder;
        yield* recorder.deleteFixture(path.id);
        return { ok: true };
      }),
    )
    .handle("replay", ({ path }) =>
      Effect.gen(function* () {
        const recorder = yield* MockGrpcRecorder;
        return yield* recorder.replayFixture(path.id);
      }),
    ),
);
