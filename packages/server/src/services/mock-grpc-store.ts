import { Context, Duration, Effect, Layer, Ref } from "effect";

export interface MockGrpcRoute {
  readonly fullMethod: string;
  readonly responses: MockGrpcResponse[];
  readonly latencyMs?: number;
  readonly enabled?: boolean;
}

export interface MockGrpcResponse {
  readonly bodyJson: string;
  readonly statusCode?: number;
  readonly statusMessage?: string;
  readonly trailers?: Array<{ key: string; value: string }>;
}

export interface MockGrpcLog {
  readonly id: string;
  readonly fullMethod: string;
  readonly requestBody: string;
  readonly responseBody: string;
  readonly statusCode: number;
  readonly matched: boolean;
  readonly createdAt: number;
}

export interface MockGrpcInvokeResult {
  readonly bodyJson: string;
  readonly statusCode: number;
  readonly statusMessage: string;
  readonly metadata: [];
  readonly trailers: Array<{ key: string; value: string }>;
  readonly durationMs: number;
  readonly error?: string;
}

interface State {
  readonly routes: MockGrpcRoute[];
  readonly logs: MockGrpcLog[];
  readonly sequenceIndex: Map<string, number>;
}

interface Decision {
  readonly result: MockGrpcInvokeResult;
  readonly log: MockGrpcLog;
  readonly latencyMs: number;
}

export class MockGrpcStore extends Context.Tag("MockGrpcStore")<
  MockGrpcStore,
  {
    readonly listRoutes: () => Effect.Effect<{
      routes: MockGrpcRoute[];
      logs: MockGrpcLog[];
    }>;
    readonly replaceRoutes: (
      routes: ReadonlyArray<MockGrpcRoute>,
    ) => Effect.Effect<{ routes: MockGrpcRoute[]; count: number }>;
    readonly clearLogs: () => Effect.Effect<void>;
    readonly invoke: (fullMethod: string, bodyJson: string) => Effect.Effect<MockGrpcInvokeResult>;
    readonly reset: () => Effect.Effect<void>;
  }
>() {}

export const MockGrpcStoreLive = Layer.effect(
  MockGrpcStore,
  Effect.gen(function* () {
    const state = yield* Ref.make<State>({
      routes: [],
      logs: [],
      sequenceIndex: new Map(),
    });

    return {
      listRoutes: () =>
        Ref.get(state).pipe(
          Effect.map((s) => ({
            routes: [...s.routes],
            logs: s.logs.slice(-200).reverse(),
          })),
        ),

      replaceRoutes: (routes) =>
        Ref.modify(state, (s) => {
          const next = routes.map((route) => ({
            ...route,
            enabled: route.enabled ?? true,
          }));
          return [
            { routes: next, count: next.length },
            { ...s, routes: next, sequenceIndex: new Map() },
          ];
        }),

      clearLogs: () => Ref.update(state, (s) => ({ ...s, logs: [] })),

      invoke: (fullMethod, bodyJson) =>
        Effect.gen(function* () {
          // Atomic: pick response + advance sequence. Defer log + latency.
          const decision = yield* Ref.modify(state, (s): [Decision, State] => {
            const route = s.routes.find(
              (candidate) => candidate.enabled !== false && candidate.fullMethod === fullMethod,
            );

            if (!route) {
              const log: MockGrpcLog = {
                id: crypto.randomUUID(),
                fullMethod,
                requestBody: bodyJson,
                responseBody: "",
                statusCode: 12,
                matched: false,
                createdAt: Date.now(),
              };
              return [
                {
                  result: {
                    bodyJson: "",
                    statusCode: 12,
                    statusMessage: `No mock route for ${fullMethod}`,
                    metadata: [],
                    trailers: [],
                    durationMs: 0,
                    error: `No mock route for ${fullMethod}`,
                  },
                  log,
                  latencyMs: 0,
                },
                s,
              ];
            }

            const idx = s.sequenceIndex.get(route.fullMethod) ?? 0;
            const response = route.responses[idx % route.responses.length];
            const nextIndex = new Map(s.sequenceIndex);
            nextIndex.set(route.fullMethod, idx + 1);
            const log: MockGrpcLog = {
              id: crypto.randomUUID(),
              fullMethod,
              requestBody: bodyJson,
              responseBody: response.bodyJson,
              statusCode: response.statusCode ?? 0,
              matched: true,
              createdAt: Date.now(),
            };
            return [
              {
                result: {
                  bodyJson: response.bodyJson,
                  statusCode: response.statusCode ?? 0,
                  statusMessage: response.statusMessage ?? "OK",
                  metadata: [],
                  trailers: response.trailers ?? [],
                  durationMs: route.latencyMs ?? 0,
                },
                log,
                latencyMs: route.latencyMs ?? 0,
              },
              { ...s, sequenceIndex: nextIndex },
            ];
          });

          if (decision.latencyMs > 0) {
            yield* Effect.sleep(Duration.millis(decision.latencyMs));
          }

          yield* Ref.update(state, (s) => ({
            ...s,
            logs: trimLogs([...s.logs, decision.log]),
          }));

          return decision.result;
        }),

      reset: () =>
        Ref.set(state, {
          routes: [],
          logs: [],
          sequenceIndex: new Map(),
        }),
    };
  }),
);

function trimLogs(logs: MockGrpcLog[]) {
  if (logs.length > 1000) logs.splice(0, logs.length - 1000);
  return logs;
}
