import type { GraphQLIntrospectionSchema } from "@invoke/core";

export interface ParsedOperation {
  name: string | null;
  kind: string;
}

export interface SavedFragment {
  id: string;
  name: string;
  onType: string;
  body: string;
}

export type CachedGraphQLSchema = {
  schema: GraphQLIntrospectionSchema;
  lastFetched: number;
};
