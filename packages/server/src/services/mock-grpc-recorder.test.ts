import { expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { MockGrpcRecorder, MockGrpcRecorderLive } from "./mock-grpc-recorder.js";

const run = <A, E>(effect: Effect.Effect<A, E, MockGrpcRecorder>) =>
  Effect.runPromise(effect.pipe(Effect.provide(Layer.fresh(MockGrpcRecorderLive))));

it("records entries, saves fixtures, and replays grouped routes", async () => {
  await run(
    Effect.gen(function* () {
      const recorder = yield* MockGrpcRecorder;
      const started = yield* recorder.start("fixture", "localhost:50051");
      expect(started.recording).toBe(true);
      expect(yield* recorder.isRecording()).toBe(true);

      yield* recorder.recordEntry({
        fullMethod: "demo.Service/Get",
        requestBody: "{}",
        responseBody: '{"ok":true}',
        statusCode: 0,
        statusMessage: "OK",
        trailers: [],
        durationMs: 5,
      });
      expect((yield* recorder.status()).entryCount).toBe(1);

      const stopped = yield* recorder.stop();
      expect(stopped.fixture?.entries).toHaveLength(1);
      const summary = yield* recorder.listFixtures();
      expect(summary).toHaveLength(1);
      expect(summary[0].entryCount).toBe(1);

      const fixture = yield* recorder.getFixture(started.fixtureId);
      expect(fixture.name).toBe("fixture");
      const replay = yield* recorder.replayFixture(started.fixtureId);
      expect(replay.count).toBe(1);
      expect(replay.routes[0].responses[0].bodyJson).toBe('{"ok":true}');

      yield* recorder.deleteFixture(started.fixtureId);
      expect(yield* recorder.listFixtures()).toHaveLength(0);
    }),
  );
});

it("does not save empty recordings and fails missing fixture lookups", async () => {
  await run(
    Effect.gen(function* () {
      const recorder = yield* MockGrpcRecorder;
      yield* recorder.start("empty", "localhost:50051");
      const stopped = yield* recorder.stop();
      expect(stopped.fixture?.entries).toHaveLength(0);
      expect(yield* recorder.listFixtures()).toHaveLength(0);

      const result = yield* Effect.either(recorder.getFixture("missing"));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("FixtureNotFoundError");
      }
    }),
  );
});
