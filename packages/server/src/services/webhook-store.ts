import { Context, Effect, Layer, Ref } from "effect";
import type { WebhookEntry, WebhookValidationConfig } from "../types/index.js";

const MAX_WEBHOOK_ENTRIES = 200;

interface State {
  readonly logs: Map<string, WebhookEntry[]>;
  readonly configs: Map<string, WebhookValidationConfig>;
}

export class WebhookStore extends Context.Tag("WebhookStore")<
  WebhookStore,
  {
    readonly getLogs: (id: string) => Effect.Effect<WebhookEntry[]>;
    readonly clearLogs: (id: string) => Effect.Effect<void>;
    readonly setConfig: (id: string, config: WebhookValidationConfig) => Effect.Effect<void>;
    readonly getConfig: (id: string) => Effect.Effect<WebhookValidationConfig | undefined>;
    readonly deleteWebhook: (id: string) => Effect.Effect<void>;
    readonly appendEntry: (id: string, entry: WebhookEntry) => Effect.Effect<void>;
  }
>() {}

type WebhookStoreApi = Context.Tag.Service<typeof WebhookStore>;

const makeWebhookStore: Effect.Effect<WebhookStoreApi> = Effect.gen(function* () {
  const state = yield* Ref.make<State>({
    logs: new Map(),
    configs: new Map(),
  });

  return {
    getLogs: (id: string) => Ref.get(state).pipe(Effect.map((s) => [...(s.logs.get(id) ?? [])])),

    clearLogs: (id: string) =>
      Ref.update(state, (s) => {
        const logs = new Map(s.logs);
        logs.delete(id);
        return { ...s, logs };
      }),

    setConfig: (id: string, config: WebhookValidationConfig) =>
      Ref.update(state, (s) => {
        const configs = new Map(s.configs);
        configs.set(id, { ...config });
        return { ...s, configs };
      }),

    getConfig: (id: string) => Ref.get(state).pipe(Effect.map((s) => s.configs.get(id))),

    deleteWebhook: (id: string) =>
      Ref.update(state, (s) => {
        const logs = new Map(s.logs);
        const configs = new Map(s.configs);
        logs.delete(id);
        configs.delete(id);
        return { logs, configs };
      }),

    appendEntry: (id: string, entry: WebhookEntry) =>
      Ref.update(state, (s) => {
        const logs = new Map(s.logs);
        const existing = logs.get(id) ?? [];
        logs.set(id, [entry, ...existing].slice(0, MAX_WEBHOOK_ENTRIES));
        return { ...s, logs };
      }),
  };
});

export const WebhookStoreLive = Layer.effect(WebhookStore, makeWebhookStore);

export const SharedWebhookStore = Effect.runSync(makeWebhookStore);

export const SharedWebhookStoreLive = Layer.succeed(WebhookStore, SharedWebhookStore);
