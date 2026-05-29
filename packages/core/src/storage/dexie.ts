import { Effect, Layer, Option } from "effect";
import { InvokeDB } from "./db";
import * as collectionStorage from "./collections";
import * as environmentStorage from "./environments";
import * as historyStorage from "./history";
import * as flowStorage from "./flows";
import { StorageError, NotFoundError } from "../errors";
import {
  CollectionStore,
  EnvironmentStore,
  HistoryStore,
  FlowStore,
  RequestStore,
} from "./services";

const db = new InvokeDB();

const tryStorage = <A>(operation: string, fn: () => Promise<A>) =>
  Effect.tryPromise({
    try: fn,
    catch: (e) => new StorageError({ cause: e, operation }),
  });

const requireExists = <A>(
  entity: string,
  id: string,
  effect: Effect.Effect<A | undefined, StorageError>,
) =>
  effect.pipe(
    Effect.flatMap((v) =>
      v === undefined ? Effect.fail(new NotFoundError({ entity, id })) : Effect.succeed(v),
    ),
  );

export const DexieCollectionStore = Layer.succeed(CollectionStore, {
  getAll: () => tryStorage("getAll", () => collectionStorage.listCollections(db)),

  getById: (id) =>
    tryStorage("getById", () => db.collections.get(id)).pipe(Effect.map(Option.fromNullable)),

  create: (data) =>
    tryStorage("create", async () => {
      const now = Date.now();
      const { v4: uuidv4 } = await import("uuid");
      const collection = { id: uuidv4(), createdAt: now, updatedAt: now, ...data };
      await db.collections.add(collection);
      return collection;
    }),

  update: (collection) =>
    requireExists(
      "collection",
      collection.id,
      tryStorage("getById", () => db.collections.get(collection.id)),
    ).pipe(
      Effect.flatMap(() =>
        tryStorage("update", async () => {
          await db.collections.put({ ...collection, updatedAt: Date.now() });
          return collection;
        }),
      ),
    ),

  delete: (id) => tryStorage("delete", () => collectionStorage.deleteCollection(db, id)),
});

export const DexieEnvironmentStore = Layer.succeed(EnvironmentStore, {
  getAll: () => tryStorage("getAll", () => environmentStorage.listEnvironments(db)),

  getById: (id) =>
    tryStorage("getById", () => db.environments.get(id)).pipe(Effect.map(Option.fromNullable)),

  save: (env) => tryStorage("save", () => environmentStorage.saveEnvironment(db, env)),

  delete: (id) => tryStorage("delete", () => environmentStorage.deleteEnvironment(db, id)),
});

export const DexieHistoryStore = Layer.succeed(HistoryStore, {
  list: (limit = 100) => tryStorage("list", () => historyStorage.listHistory(db, limit)),

  add: (entry) => tryStorage("add", () => historyStorage.addHistory(db, entry)),

  delete: (id) => tryStorage("delete", () => historyStorage.deleteHistoryEntry(db, id)),

  clear: () => tryStorage("clear", () => historyStorage.clearHistory(db)),
});

export const DexieFlowStore = Layer.succeed(FlowStore, {
  getAll: () => tryStorage("getAll", () => flowStorage.listFlows(db)),

  getById: (id) =>
    tryStorage("getById", () => db.flows.get(id)).pipe(Effect.map(Option.fromNullable)),

  save: (flow) => tryStorage("save", () => flowStorage.saveFlow(db, flow)),

  delete: (id) => tryStorage("delete", () => flowStorage.deleteFlow(db, id)),
});

export const DexieRequestStore = Layer.succeed(RequestStore, {
  list: (collectionId) =>
    tryStorage("list", () => collectionStorage.listRequests(db, collectionId)),

  getById: (id) =>
    tryStorage("getById", () => db.requests.get(id)).pipe(Effect.map(Option.fromNullable)),

  delete: (id) => tryStorage("delete", () => collectionStorage.deleteRequest(db, id)),
});

export const DexieStorageLive = Layer.mergeAll(
  DexieCollectionStore,
  DexieEnvironmentStore,
  DexieHistoryStore,
  DexieFlowStore,
  DexieRequestStore,
);
