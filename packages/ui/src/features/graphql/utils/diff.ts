import type { GraphQLIntrospectionSchema } from "@invoke/core";

export function diffSchemas(
  oldSchema: GraphQLIntrospectionSchema,
  newSchema: GraphQLIntrospectionSchema,
): { added: string[]; removed: string[] } {
  const oldNames = new Set(
    oldSchema.types.filter((t) => !t.name.startsWith("__")).map((t) => t.name),
  );
  const newNames = new Set(
    newSchema.types.filter((t) => !t.name.startsWith("__")).map((t) => t.name),
  );
  return {
    added: [...newNames].filter((n) => !oldNames.has(n)),
    removed: [...oldNames].filter((n) => !newNames.has(n)),
  };
}
