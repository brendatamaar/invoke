import type {
  CachedGraphQLSchema,
  DefaultProtocolOptions,
  DiffIgnoreRule,
  ProtocolNetworkDefaults,
  ResponseExample,
  RetentionSettings,
} from "../types";
import { INITIAL_PROTOCOL_DEFAULTS } from "../types";
import { clonePlain } from "../request";
import type { InvokeDB } from "./db";
import { schemaCacheKey } from "./helpers";

export async function getMeta<T>(db: InvokeDB, key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(db: InvokeDB, key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value: clonePlain(value) });
}

export async function getGraphQLSchema(db: InvokeDB, endpoint: string) {
  return getMeta<CachedGraphQLSchema>(db, schemaCacheKey(endpoint));
}

export async function saveGraphQLSchema(db: InvokeDB, schema: CachedGraphQLSchema) {
  await setMeta(db, schemaCacheKey(schema.endpoint), schema);
  return schema;
}

export function getRetentionSettings(db: InvokeDB) {
  return getMeta<RetentionSettings>(db, "retentionSettings");
}

export function setRetentionSettings(db: InvokeDB, settings: RetentionSettings) {
  return setMeta(db, "retentionSettings", settings);
}

function mergeProtocolDefaults(
  initial: ProtocolNetworkDefaults,
  stored: Partial<ProtocolNetworkDefaults> | undefined,
): ProtocolNetworkDefaults {
  const storedOptions = stored?.options ?? {};
  return {
    options: {
      ...initial.options,
      ...storedOptions,
      tlsClientConfig: {
        ...(initial.options.tlsClientConfig ?? {}),
        ...(storedOptions.tlsClientConfig ?? {}),
      },
      ...(storedOptions.proxy ? { proxy: { ...storedOptions.proxy } } : {}),
    },
  };
}

export function mergeDefaults(
  initial: DefaultProtocolOptions,
  stored?: Partial<Record<keyof DefaultProtocolOptions, Partial<ProtocolNetworkDefaults>>>,
): DefaultProtocolOptions {
  return {
    rest: mergeProtocolDefaults(initial.rest, stored?.rest),
    graphql: mergeProtocolDefaults(initial.graphql, stored?.graphql),
    websocket: mergeProtocolDefaults(initial.websocket, stored?.websocket),
    grpc: mergeProtocolDefaults(initial.grpc, stored?.grpc),
  };
}

export async function getDefaultProtocolOptions(db: InvokeDB): Promise<DefaultProtocolOptions> {
  const stored = await getMeta<
    Partial<Record<keyof DefaultProtocolOptions, Partial<ProtocolNetworkDefaults>>>
  >(db, "defaultProtocolOptions");
  return mergeDefaults(INITIAL_PROTOCOL_DEFAULTS, stored);
}

export function setDefaultProtocolOptions(db: InvokeDB, defaults: DefaultProtocolOptions) {
  return setMeta(db, "defaultProtocolOptions", mergeDefaults(INITIAL_PROTOCOL_DEFAULTS, defaults));
}

export async function listResponseExamples(db: InvokeDB): Promise<ResponseExample[]> {
  return (await getMeta<ResponseExample[]>(db, "responseExamples")) ?? [];
}

export async function saveResponseExample(db: InvokeDB, example: ResponseExample): Promise<void> {
  const existing = await listResponseExamples(db);
  const idx = existing.findIndex((e) => e.id === example.id);
  if (idx >= 0) existing[idx] = example;
  else existing.push(example);
  await setMeta(db, "responseExamples", existing);
}

export async function deleteResponseExample(db: InvokeDB, id: string): Promise<void> {
  const existing = await listResponseExamples(db);
  await setMeta(
    db,
    "responseExamples",
    existing.filter((e) => e.id !== id),
  );
}

export async function listDiffIgnoreRules(db: InvokeDB): Promise<DiffIgnoreRule[]> {
  return (await getMeta<DiffIgnoreRule[]>(db, "diffIgnoreRules")) ?? [];
}

export function saveDiffIgnoreRules(db: InvokeDB, rules: DiffIgnoreRule[]): Promise<void> {
  return setMeta(db, "diffIgnoreRules", rules);
}
