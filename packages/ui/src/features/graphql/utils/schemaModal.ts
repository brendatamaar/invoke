import type { GraphQLIntrospectionSchema } from "@invoke/core";
import type { SavedFragment } from "../types";
import { diffSchemas } from "./diff";

export function refreshMessage(
  oldSchema: GraphQLIntrospectionSchema,
  newSchema: GraphQLIntrospectionSchema,
) {
  const diff = diffSchemas(oldSchema, newSchema);
  const parts: string[] = [];
  if (diff.added.length) {
    parts.push(`+${diff.added.length} type${diff.added.length > 1 ? "s" : ""}`);
  }
  if (diff.removed.length) {
    parts.push(`-${diff.removed.length} type${diff.removed.length > 1 ? "s" : ""}`);
  }
  return parts.length ? `Schema refreshed (${parts.join(", ")})` : "Schema refreshed — no changes";
}

export function mergeFragments(current: SavedFragment[], incoming: SavedFragment[]) {
  if (incoming.length === 0) return current;
  const existing = new Set(current.map((f) => f.name));
  return [...current, ...incoming.filter((fragment) => !existing.has(fragment.name))];
}
