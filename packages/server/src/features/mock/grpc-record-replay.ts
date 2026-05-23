import { Schema } from "effect";
import type { Hono } from "hono";
import { parseJsonBody } from "../../lib/validate.js";

/**
 * gRPC connection record/replay.
 * Records real-server transcripts (reflection + method invocations) into fixtures,
 * which can be replayed against the mock gRPC server for regression tests.
 */

export interface GrpcFixtureEntry {
  fullMethod: string;
  requestBody: string;
  responseBody: string;
  statusCode: number;
  statusMessage: string;
  trailers: Array<{ key: string; value: string }>;
  durationMs: number;
  timestamp: number;
}

export interface GrpcFixture {
  id: string;
  name: string;
  address: string;
  entries: GrpcFixtureEntry[];
  createdAt: number;
}

let recording = false;
let activeFixture: GrpcFixture | null = null;
const fixtures: GrpcFixture[] = [];

const startRecordingSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  address: Schema.String.pipe(Schema.minLength(1)),
});

export function registerGrpcRecordReplayRoutes(app: Hono) {
  app.post("/api/mock-grpc/record/start", async (c) => {
    const parsed = await parseJsonBody(c, startRecordingSchema);
    if (!parsed.ok) return parsed.response;
    {
      const { name, address } = parsed.data;
      activeFixture = {
        id: crypto.randomUUID(),
        name,
        address,
        entries: [],
        createdAt: Date.now(),
      };
      recording = true;
      return c.json({ recording: true, fixtureId: activeFixture.id });
    }
  });

  app.post("/api/mock-grpc/record/stop", (c) => {
    if (activeFixture && activeFixture.entries.length > 0) {
      fixtures.push(activeFixture);
    }
    const fixture = activeFixture;
    activeFixture = null;
    recording = false;
    return c.json({ recording: false, fixture });
  });

  app.get("/api/mock-grpc/record/status", (c) =>
    c.json({ recording, entryCount: activeFixture?.entries.length ?? 0 }),
  );

  app.get("/api/mock-grpc/fixtures", (c) =>
    c.json({
      fixtures: fixtures.map(({ id, name, address, createdAt, entries }) => ({
        id,
        name,
        address,
        createdAt,
        entryCount: entries.length,
      })),
    }),
  );

  app.get("/api/mock-grpc/fixtures/:id", (c) => {
    const fixture = fixtures.find((f) => f.id === c.req.param("id"));
    if (!fixture) return c.json({ error: "Fixture not found" }, 404);
    return c.json(fixture);
  });

  app.delete("/api/mock-grpc/fixtures/:id", (c) => {
    const idx = fixtures.findIndex((f) => f.id === c.req.param("id"));
    if (idx === -1) return c.json({ error: "Fixture not found" }, 404);
    fixtures.splice(idx, 1);
    return c.json({ ok: true });
  });

  /** Replay a fixture into the mock gRPC route table. */
  app.post("/api/mock-grpc/fixtures/:id/replay", (c) => {
    const fixture = fixtures.find((f) => f.id === c.req.param("id"));
    if (!fixture) return c.json({ error: "Fixture not found" }, 404);

    // Group entries by fullMethod, use responses as sequence
    const routeMap = new Map<
      string,
      {
        responses: Array<{
          bodyJson: string;
          statusCode: number;
          statusMessage: string;
          trailers: Array<{ key: string; value: string }>;
        }>;
      }
    >();
    for (const entry of fixture.entries) {
      if (!routeMap.has(entry.fullMethod)) {
        routeMap.set(entry.fullMethod, { responses: [] });
      }
      routeMap.get(entry.fullMethod)!.responses.push({
        bodyJson: entry.responseBody,
        statusCode: entry.statusCode,
        statusMessage: entry.statusMessage,
        trailers: entry.trailers,
      });
    }

    const routes = [...routeMap.entries()].map(([fullMethod, data]) => ({
      fullMethod,
      responses: data.responses,
      enabled: true,
    }));

    return c.json({ routes, count: routes.length });
  });
}

/** Call this from the gRPC execute proxy to record entries when recording is active. */
export function recordGrpcEntry(entry: Omit<GrpcFixtureEntry, "timestamp">) {
  if (!recording || !activeFixture) return;
  activeFixture.entries.push({ ...entry, timestamp: Date.now() });
}

export function isRecording() {
  return recording;
}
