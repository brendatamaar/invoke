export interface CachedGraphQLSchema {
  endpoint: string;
  schema: GraphQLIntrospectionSchema;
  lastFetched: number;
}

export interface GraphQLIntrospectionSchema {
  queryType?: { name: string };
  mutationType?: { name: string } | null;
  subscriptionType?: { name: string } | null;
  types: GraphQLIntrospectionType[];
}

export interface GraphQLIntrospectionType {
  kind: string;
  name: string;
  description?: string | null;
  fields?: GraphQLIntrospectionField[] | null;
}

export interface GraphQLIntrospectionField {
  name: string;
  description?: string | null;
  args?: GraphQLIntrospectionInputValue[] | null;
  type: GraphQLIntrospectionTypeRef;
}

export interface GraphQLIntrospectionInputValue {
  name: string;
  description?: string | null;
  type: GraphQLIntrospectionTypeRef;
  defaultValue?: string | null;
}

export interface GraphQLIntrospectionTypeRef {
  kind: string;
  name?: string | null;
  ofType?: GraphQLIntrospectionTypeRef | null;
}
