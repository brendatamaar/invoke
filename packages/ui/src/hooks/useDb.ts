import { useLiveQuery } from "dexie-react-hooks";
import { db, INITIAL_PROTOCOL_DEFAULTS } from "@invoke/core";
import type {
  DefaultProtocolOptions,
  DiffIgnoreRule,
  MockRoute,
  ResponseExample,
  RetentionSettings,
} from "@invoke/core";
import { coreStore } from "../store/coreStore";

export function useCollections() {
  return useLiveQuery(() => db.collections.orderBy("sortOrder").toArray()) ?? [];
}

export function useFolders() {
  return useLiveQuery(() => db.folders.orderBy("sortOrder").toArray()) ?? [];
}

export function useFlows() {
  return useLiveQuery(() => db.flows.orderBy("updatedAt").reverse().toArray()) ?? [];
}

export function useHistory(limit = 200) {
  return (
    useLiveQuery(
      () => db.history.orderBy("createdAt").reverse().limit(limit).toArray(),
      [limit],
    ) ?? []
  );
}

export function useCookies() {
  return useLiveQuery(() => db.cookies.toArray()) ?? [];
}

export function useMockRoutes() {
  return (
    useLiveQuery(() =>
      db.meta.get("mockRoutes").then((r) => (r?.value as MockRoute[]) ?? []),
    ) ?? []
  );
}

export function useResponseExamples() {
  return (
    useLiveQuery(() =>
      db.meta
        .get("responseExamples")
        .then((r) => (r?.value as ResponseExample[]) ?? []),
    ) ?? []
  );
}

export function useRetentionSettings() {
  return useLiveQuery(() =>
    db.meta
      .get("retentionSettings")
      .then((r) => r?.value as RetentionSettings | undefined),
  );
}

export function useDiffIgnoreRules() {
  return (
    useLiveQuery(() =>
      db.meta
        .get("diffIgnoreRules")
        .then((r) => (r?.value as DiffIgnoreRule[]) ?? []),
    ) ?? []
  );
}

export function useProtocolDefaults(): DefaultProtocolOptions {
  return (
    useLiveQuery(() => coreStore.getDefaultProtocolOptions()) ??
    INITIAL_PROTOCOL_DEFAULTS
  );
}
