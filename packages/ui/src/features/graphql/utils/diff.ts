import type { GraphQLIntrospectionSchema } from "@invoke/core";

export function diffSchemas(
  oldSchema: GraphQLIntrospectionSchema,
  newSchema: GraphQLIntrospectionSchema,
): { added: string[]; removed: string[] } {
  const oldNames = oldSchema.types.reduce<Set<string>>((acc, t) => {
    if (!t.name.startsWith("__")) acc.add(t.name);
    return acc;
  }, new Set());
  const newNames = newSchema.types.reduce<Set<string>>((acc, t) => {
    if (!t.name.startsWith("__")) acc.add(t.name);
    return acc;
  }, new Set());
  return {
    added: [...newNames].filter((n) => !oldNames.has(n)),
    removed: [...oldNames].filter((n) => !newNames.has(n)),
  };
}
