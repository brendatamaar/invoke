import type { GraphQLIntrospectionSchema } from "@invoke/core";
import type { CachedGraphQLSchema } from "../types";

const CACHE_PREFIX = "gql_schema_";

export function cacheSchema(
  endpoint: string,
  schema: GraphQLIntrospectionSchema,
  lastFetched: number,
) {
  try {
    localStorage.setItem(CACHE_PREFIX + endpoint, JSON.stringify({ schema, lastFetched }));
  } catch {
    /* quota exceeded */
  }
}

export function loadCachedSchema(endpoint: string): CachedGraphQLSchema | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + endpoint);
    if (!raw) return null;
    return JSON.parse(raw) as CachedGraphQLSchema;
  } catch {
    return null;
  }
}

export function fmtAge(ts: number): string {
  if (!ts) return "";
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
