import type { KeyValue, MockLogEntry, MockRoute } from "@invoke/core";
import { Context, Effect, Layer, Ref } from "effect";
import { findMockRouteMatch } from "./mock-match.js";

interface State {
  readonly routes: MockRoute[];
  readonly logs: MockLogEntry[];
  readonly sequenceIndex: Map<string, number>;
}

export class MockStore extends Context.Tag("MockStore")<
  MockStore,
  {
    readonly listRoutes: () => Effect.Effect<{
      routes: MockRoute[];
      logs: MockLogEntry[];
      totalLogs: number;
    }>;
    readonly replaceRoutes: (
      routes: ReadonlyArray<MockRoute>,
    ) => Effect.Effect<{ routes: MockRoute[]; count: number }>;
    readonly appendLog: (entry: Omit<MockLogEntry, "id" | "createdAt">) => Effect.Effect<void>;
    readonly clearLogs: () => Effect.Effect<void>;
    readonly findMatch: (
      method: string,
      path: string,
      headers: KeyValue[],
      query: URLSearchParams,
      body: string,
    ) => Effect.Effect<{
      route: MockRoute;
      params: Record<string, string>;
    } | null>;
    readonly nextSequenceItem: (
      route: MockRoute,
    ) => Effect.Effect<MockRoute | NonNullable<MockRoute["sequences"]>[number]>;
    readonly proxyImport: (
      records: ReadonlyArray<{
        id: string;
        method: string;
        path: string;
        status: number;
        responseHeaders: KeyValue[];
        responseBody: string;
      }>,
    ) => Effect.Effect<{ added: number; routes: MockRoute[] }>;
  }
>() {}

type MockStoreApi = Context.Tag.Service<typeof MockStore>;

const validMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

const makeMockStore: Effect.Effect<MockStoreApi> = Effect.gen(function* () {
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
          totalLogs: s.logs.length,
        })),
      ),

    replaceRoutes: (routes: ReadonlyArray<MockRoute>) =>
      Ref.modify(state, (s) => {
        const next = routes.map((route) => ({
          ...route,
          headers: [...(route.headers ?? [])],
          enabled: route.enabled ?? true,
        })) as MockRoute[];
        return [
          { routes: next, count: next.length },
          { ...s, routes: next, sequenceIndex: new Map() },
        ];
      }),

    appendLog: (entry: Omit<MockLogEntry, "id" | "createdAt">) =>
      Ref.update(state, (s) => {
        const log: MockLogEntry = {
          ...entry,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        };
        const logs = [...s.logs, log];
        if (logs.length > 1000) logs.splice(0, logs.length - 1000);
        return { ...s, logs };
      }),

    clearLogs: () => Ref.update(state, (s) => ({ ...s, logs: [] })),

    findMatch: (
      method: string,
      path: string,
      headers: KeyValue[],
      query: URLSearchParams,
      body: string,
    ) =>
      Ref.get(state).pipe(
        Effect.map((s) => findMockRouteMatch(s.routes, method, path, headers, query, body)),
      ),

    nextSequenceItem: (route: MockRoute) =>
      Ref.modify(state, (s) => {
        if (route.sequences && route.sequences.length > 0) {
          const idx = s.sequenceIndex.get(route.id) ?? 0;
          const item = route.sequences[idx % route.sequences.length];
          const nextIndex = new Map(s.sequenceIndex);
          nextIndex.set(route.id, idx + 1);
          return [item, { ...s, sequenceIndex: nextIndex }];
        }
        return [route, s];
      }),

    proxyImport: (
      records: ReadonlyArray<{
        id: string;
        method: string;
        path: string;
        status: number;
        responseHeaders: KeyValue[];
        responseBody: string;
      }>,
    ) =>
      Ref.modify(state, (s) => {
        const newRoutes: MockRoute[] = records.map((record) => ({
          id: crypto.randomUUID(),
          enabled: true,
          method: (validMethods.has(record.method.toUpperCase())
            ? record.method.toUpperCase()
            : "GET") as MockRoute["method"],
          pathPattern: record.path.split("?")[0] || "/",
          status: record.status,
          headers: record.responseHeaders,
          body: record.responseBody,
          latencyMs: 0,
        }));
        const existing = s.routes.filter(
          (route) =>
            !newRoutes.some(
              (newRoute) =>
                newRoute.method === route.method &&
                newRoute.pathPattern === route.pathPattern &&
                (!route.conditions || route.conditions.length === 0),
            ),
        );
        const merged = [...existing, ...newRoutes];
        return [
          { added: newRoutes.length, routes: merged },
          { ...s, routes: merged, sequenceIndex: new Map() },
        ];
      }),
  };
});

export const MockStoreLive = Layer.effect(MockStore, makeMockStore);

export const SharedMockStore = Effect.runSync(makeMockStore);

export const SharedMockStoreLive = Layer.succeed(MockStore, SharedMockStore);
