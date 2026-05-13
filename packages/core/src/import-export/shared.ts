import type { KeyValue } from "../types";

export function recordToKeyValues(
  value: Record<string, string> | KeyValue[] = {},
) {
  if (Array.isArray(value)) return value;
  return Object.entries(value).map(([key, raw]) => ({
    key,
    value: String(raw),
    enabled: true,
  }));
}
