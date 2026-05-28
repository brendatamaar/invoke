import { Context, Effect, Layer, Option, Ref } from "effect";
import { FixtureNotFoundError } from "../errors.js";

export interface GrpcFixtureEntry {
  readonly fullMethod: string;
  readonly requestBody: string;
  readonly responseBody: string;
  readonly statusCode: number;
  readonly statusMessage: string;
  readonly trailers: Array<{ key: string; value: string }>;
  readonly durationMs: number;
  readonly timestamp: number;
}

export interface GrpcFixture {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly entries: GrpcFixtureEntry[];
  readonly createdAt: number;
}

export interface GrpcFixtureSummary {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly createdAt: number;
  readonly entryCount: number;
}

interface State {
  readonly recording: boolean;
  readonly active: Option.Option<GrpcFixture>;
  readonly fixtures: GrpcFixture[];
}

export class MockGrpcRecorder extends Context.Tag("MockGrpcRecorder")<
  MockGrpcRecorder,
  {
    readonly start: (
      name: string,
      address: string,
    ) => Effect.Effect<{ recording: true; fixtureId: string }>;
    readonly stop: () => Effect.Effect<{
      recording: false;
      fixture: GrpcFixture | null;
    }>;
    readonly status: () => Effect.Effect<{
      recording: boolean;
      entryCount: number;
    }>;
    readonly listFixtures: () => Effect.Effect<GrpcFixtureSummary[]>;
    readonly getFixture: (id: string) => Effect.Effect<GrpcFixture, FixtureNotFoundError>;
    readonly deleteFixture: (id: string) => Effect.Effect<void, FixtureNotFoundError>;
    readonly replayFixture: (id: string) => Effect.Effect<
      {
        routes: Array<{
          fullMethod: string;
          responses: Array<{
            bodyJson: string;
            statusCode: number;
            statusMessage: string;
            trailers: Array<{ key: string; value: string }>;
          }>;
          enabled: true;
        }>;
        count: number;
      },
      FixtureNotFoundError
    >;
    readonly recordEntry: (entry: Omit<GrpcFixtureEntry, "timestamp">) => Effect.Effect<void>;
    readonly isRecording: () => Effect.Effect<boolean>;
  }
>() {}

export const MockGrpcRecorderLive = Layer.effect(
  MockGrpcRecorder,
  Effect.gen(function* () {
    const state = yield* Ref.make<State>({
      recording: false,
      active: Option.none(),
      fixtures: [],
    });

    return {
      start: (name, address) =>
        Ref.modify(state, (s) => {
          const fixture: GrpcFixture = {
            id: crypto.randomUUID(),
            name,
            address,
            entries: [],
            createdAt: Date.now(),
          };
          return [
            { recording: true as const, fixtureId: fixture.id },
            { ...s, recording: true, active: Option.some(fixture) },
          ];
        }),

      stop: () =>
        Ref.modify(state, (s) => {
          const active = Option.getOrNull(s.active);
          const fixtures =
            active && active.entries.length > 0 ? [...s.fixtures, active] : s.fixtures;
          return [
            { recording: false as const, fixture: active },
            { recording: false, active: Option.none(), fixtures },
          ];
        }),

      status: () =>
        Ref.get(state).pipe(
          Effect.map((s) => ({
            recording: s.recording,
            entryCount: Option.match(s.active, {
              onNone: () => 0,
              onSome: (fixture) => fixture.entries.length,
            }),
          })),
        ),

      listFixtures: () =>
        Ref.get(state).pipe(
          Effect.map((s) =>
            s.fixtures.map(({ id, name, address, createdAt, entries }) => ({
              id,
              name,
              address,
              createdAt,
              entryCount: entries.length,
            })),
          ),
        ),

      getFixture: (id) =>
        Ref.get(state).pipe(
          Effect.flatMap((s) => {
            const fixture = s.fixtures.find((candidate) => candidate.id === id);
            return fixture
              ? Effect.succeed(fixture)
              : Effect.fail(new FixtureNotFoundError({ id }));
          }),
        ),

      deleteFixture: (id) =>
        Ref.modify(state, (s) => {
          const idx = s.fixtures.findIndex((fixture) => fixture.id === id);
          if (idx === -1) return [false, s] as const;
          const fixtures = [...s.fixtures];
          fixtures.splice(idx, 1);
          return [true, { ...s, fixtures }] as const;
        }).pipe(
          Effect.flatMap((deleted) =>
            deleted ? Effect.void : Effect.fail(new FixtureNotFoundError({ id })),
          ),
        ),

      replayFixture: (id) =>
        Ref.get(state).pipe(
          Effect.flatMap((s) => {
            const fixture = s.fixtures.find((candidate) => candidate.id === id);
            if (!fixture) return Effect.fail(new FixtureNotFoundError({ id }));

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
              enabled: true as const,
            }));
            return Effect.succeed({ routes, count: routes.length });
          }),
        ),

      recordEntry: (entry) =>
        Ref.update(state, (s) => {
          if (!s.recording) return s;
          return Option.match(s.active, {
            onNone: () => s,
            onSome: (fixture) => ({
              ...s,
              active: Option.some({
                ...fixture,
                entries: [...fixture.entries, { ...entry, timestamp: Date.now() }],
              }),
            }),
          });
        }),

      isRecording: () => Ref.get(state).pipe(Effect.map((s) => s.recording)),
    };
  }),
);
