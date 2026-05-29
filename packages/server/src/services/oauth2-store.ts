import { Context, Effect, Layer, Ref } from "effect";
import type { OAuth2PendingResult } from "../types/index.js";

export class OAuth2Store extends Context.Tag("OAuth2Store")<
  OAuth2Store,
  {
    readonly set: (state: string, pending: OAuth2PendingResult) => Effect.Effect<void>;
    readonly get: (state: string) => Effect.Effect<OAuth2PendingResult | undefined>;
    readonly delete: (state: string) => Effect.Effect<void>;
    readonly getAndDeleteIfTerminal: (
      state: string,
    ) => Effect.Effect<OAuth2PendingResult | undefined>;
  }
>() {}

type OAuth2StoreApi = Context.Tag.Service<typeof OAuth2Store>;

const makeOAuth2Store: Effect.Effect<OAuth2StoreApi> = Effect.gen(function* () {
  const pending = yield* Ref.make(new Map<string, OAuth2PendingResult>());
  return {
    set: (state: string, value: OAuth2PendingResult) =>
      Ref.update(pending, (items) => {
        const next = new Map(items);
        next.set(state, value);
        return next;
      }),

    get: (state: string) => Ref.get(pending).pipe(Effect.map((items) => items.get(state))),

    delete: (state: string) =>
      Ref.update(pending, (items) => {
        const next = new Map(items);
        next.delete(state);
        return next;
      }),

    getAndDeleteIfTerminal: (state: string) =>
      Ref.modify(pending, (items) => {
        const result = items.get(state);
        if (!result || (result.status !== "done" && result.status !== "error")) {
          return [result, items];
        }
        const next = new Map(items);
        next.delete(state);
        return [result, next];
      }),
  };
});

export const OAuth2StoreLive = Layer.effect(OAuth2Store, makeOAuth2Store);

export const SharedOAuth2Store = Effect.runSync(makeOAuth2Store);

export const SharedOAuth2StoreLive = Layer.succeed(OAuth2Store, SharedOAuth2Store);
