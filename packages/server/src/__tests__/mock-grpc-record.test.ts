import { expect, it } from "vitest";
import { Effect } from "effect";
import { makeTestClient, makeTestServer, runScoped } from "../test-support/test-server.js";

it("tracks gRPC recording lifecycle", async () => {
  await runScoped(
    Effect.gen(function* () {
      const server = yield* makeTestServer();
      const client = yield* makeTestClient(server);

      const started = (yield* client.mockGrpcRecord.start({
        payload: { name: "fixture", address: "127.0.0.1:50051" },
      })) as any;
      expect(started.recording).toBe(true);
      expect(started.fixtureId).toBeTruthy();

      const status = yield* client.mockGrpcRecord.status({});
      expect(status).toMatchObject({ recording: true, entryCount: 0 });

      const stopped = (yield* client.mockGrpcRecord.stop({})) as any;
      expect(stopped.recording).toBe(false);
      expect(stopped.fixture).toMatchObject({ name: "fixture" });
    }),
  );
});
