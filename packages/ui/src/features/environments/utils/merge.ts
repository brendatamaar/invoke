import type { KeyValue } from "@invoke/core";

export function mergeVariables(existing: KeyValue[], imported: KeyValue[]) {
  const byKey = new Map<string, KeyValue>();
  existing.forEach((variable) => byKey.set(variable.key, variable));
  imported.forEach((variable) =>
    byKey.set(variable.key, { ...byKey.get(variable.key), ...variable }),
  );
  return [...byKey.values()];
}
