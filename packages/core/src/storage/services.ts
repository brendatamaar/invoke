import { Context, Effect, Option } from "effect"
import type {
  Collection,
  Environment,
  Flow,
  HistoryEntry,
  SavedRequest,
} from "../types"
import type { StorageError, NotFoundError } from "../errors"

export class CollectionStore extends Context.Tag("CollectionStore")<
  CollectionStore,
  {
    getAll: () => Effect.Effect<Collection[], StorageError>
    getById: (id: string) => Effect.Effect<Option.Option<Collection>, StorageError>
    create: (data: Omit<Collection, "id" | "createdAt" | "updatedAt">) => Effect.Effect<Collection, StorageError>
    update: (collection: Collection) => Effect.Effect<Collection, StorageError | NotFoundError>
    delete: (id: string) => Effect.Effect<void, StorageError | NotFoundError>
  }
>() {}

export class EnvironmentStore extends Context.Tag("EnvironmentStore")<
  EnvironmentStore,
  {
    getAll: () => Effect.Effect<Environment[], StorageError>
    getById: (id: string) => Effect.Effect<Option.Option<Environment>, StorageError>
    save: (env: Partial<Environment> & Pick<Environment, "name" | "variables">) => Effect.Effect<Environment, StorageError>
    delete: (id: string) => Effect.Effect<void, StorageError | NotFoundError>
  }
>() {}

export class HistoryStore extends Context.Tag("HistoryStore")<
  HistoryStore,
  {
    list: (limit?: number) => Effect.Effect<HistoryEntry[], StorageError>
    add: (entry: Omit<HistoryEntry, "id" | "createdAt">) => Effect.Effect<HistoryEntry, StorageError>
    delete: (id: string) => Effect.Effect<void, StorageError | NotFoundError>
    clear: () => Effect.Effect<void, StorageError>
  }
>() {}

export class FlowStore extends Context.Tag("FlowStore")<
  FlowStore,
  {
    getAll: () => Effect.Effect<Flow[], StorageError>
    getById: (id: string) => Effect.Effect<Option.Option<Flow>, StorageError>
    save: (flow: Partial<Flow> & Pick<Flow, "name" | "steps">) => Effect.Effect<Flow, StorageError>
    delete: (id: string) => Effect.Effect<void, StorageError | NotFoundError>
  }
>() {}

export class RequestStore extends Context.Tag("RequestStore")<
  RequestStore,
  {
    list: (collectionId?: string) => Effect.Effect<SavedRequest[], StorageError>
    getById: (id: string) => Effect.Effect<Option.Option<SavedRequest>, StorageError>
    delete: (id: string) => Effect.Effect<void, StorageError | NotFoundError>
  }
>() {}
