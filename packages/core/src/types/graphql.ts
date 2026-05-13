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
  directives?: GraphQLIntrospectionDirective[];
}

export interface GraphQLIntrospectionType {
  kind: string;
  name: string;
  description?: string | null;
  fields?: GraphQLIntrospectionField[] | null;
  inputFields?: GraphQLIntrospectionInputValue[] | null;
  enumValues?: GraphQLIntrospectionEnumValue[] | null;
  interfaces?: GraphQLIntrospectionTypeRef[] | null;
  possibleTypes?: GraphQLIntrospectionTypeRef[] | null;
}

export interface GraphQLIntrospectionField {
  name: string;
  description?: string | null;
  args?: GraphQLIntrospectionInputValue[] | null;
  type: GraphQLIntrospectionTypeRef;
  isDeprecated?: boolean;
  deprecationReason?: string | null;
}

export interface GraphQLIntrospectionInputValue {
  name: string;
  description?: string | null;
  type: GraphQLIntrospectionTypeRef;
  defaultValue?: string | null;
}

export interface GraphQLIntrospectionEnumValue {
  name: string;
  description?: string | null;
  isDeprecated?: boolean;
  deprecationReason?: string | null;
}

export interface GraphQLIntrospectionTypeRef {
  kind: string;
  name?: string | null;
  ofType?: GraphQLIntrospectionTypeRef | null;
}

export interface GraphQLIntrospectionDirective {
  name: string;
  description?: string | null;
  locations: string[];
  args?: GraphQLIntrospectionInputValue[];
  isRepeatable?: boolean;
}
