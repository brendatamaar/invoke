import { Context, Effect, Layer, Ref } from "effect";
import type { ProxyRecordEntry } from "../types/index.js";

const MAX_PROXY_RECORDS = 500;

export class ProxyRecordStore extends Context.Tag("ProxyRecordStore")<
  ProxyRecordStore,
  {
    readonly list: () => Effect.Effect<ProxyRecordEntry[]>;
    readonly append: (entry: ProxyRecordEntry) => Effect.Effect<void>;
    readonly clear: () => Effect.Effect<void>;
    readonly selectByIds: (
      ids: ReadonlyArray<string> | undefined,
    ) => Effect.Effect<ProxyRecordEntry[]>;
  }
>() {}

export const ProxyRecordStoreLive = Layer.effect(
  ProxyRecordStore,
  Effect.gen(function* () {
    const records = yield* Ref.make<ProxyRecordEntry[]>([]);
    return {
      list: () => Ref.get(records).pipe(Effect.map((items) => [...items])),

      append: (entry) =>
        Ref.update(records, (items) => [entry, ...items].slice(0, MAX_PROXY_RECORDS)),

      clear: () => Ref.set(records, []),

      selectByIds: (ids) =>
        Ref.get(records).pipe(
          Effect.map((items) =>
            ids ? items.filter((record) => ids.includes(record.id)) : [...items],
          ),
        ),
    };
  }),
);
