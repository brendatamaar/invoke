import { expect, it } from "vitest";
import { Effect, Layer } from "effect";
import type { ProxyRecordEntry } from "../types/index.js";
import { ProxyRecordStore, ProxyRecordStoreLive } from "./proxy-record-store.js";

const run = <A, E>(effect: Effect.Effect<A, E, ProxyRecordStore>) =>
  Effect.runPromise(effect.pipe(Effect.provide(Layer.fresh(ProxyRecordStoreLive))));

const record = (id: string): ProxyRecordEntry => ({
  id,
  method: "GET",
  path: `/${id}`,
  requestHeaders: [],
  requestBody: "",
  status: 200,
  responseHeaders: [],
  responseBody: id,
  createdAt: Date.now(),
});

it("prepends records and caps history at 500", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* ProxyRecordStore;
      for (let index = 0; index < 501; index += 1) {
        yield* store.append(record(String(index)));
      }
      const records = yield* store.list();
      expect(records).toHaveLength(500);
      expect(records[0].id).toBe("500");
      expect(records.some((entry) => entry.id === "0")).toBe(false);
    }),
  );
});

it("selects by ids and clears records", async () => {
  await run(
    Effect.gen(function* () {
      const store = yield* ProxyRecordStore;
      yield* store.append(record("a"));
      yield* store.append(record("b"));
      expect((yield* store.selectByIds(["a"])).map((entry) => entry.id)).toEqual(["a"]);
      expect(yield* store.selectByIds(undefined)).toHaveLength(2);
      yield* store.clear();
      expect(yield* store.list()).toHaveLength(0);
    }),
  );
});
