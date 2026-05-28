import type {
  GraphQLIntrospectionField,
  GraphQLIntrospectionSchema,
  GraphQLIntrospectionType,
  GraphQLIntrospectionTypeRef,
} from "../types";

export const GRAPHQL_INTROSPECTION_QUERY = `query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        isDeprecated
        deprecationReason
        args {
          name
          description
          type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
          defaultValue
        }
        type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
      }
      inputFields {
        name
        description
        type { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
        defaultValue
      }
      enumValues(includeDeprecated: true) {
        name
        description
        isDeprecated
        deprecationReason
      }
      interfaces {
        kind
        name
        ofType { kind name ofType { kind name } }
      }
      possibleTypes {
        kind
        name
        ofType { kind name ofType { kind name } }
      }
    }
  }
}`;

export function parseGraphQLIntrospection(body: string): GraphQLIntrospectionSchema {
  const parsed = JSON.parse(body) as any;
  const schema = parsed?.data?.__schema ?? parsed?.__schema;
  if (!schema?.types)
    throw new Error("GraphQL introspection response did not include data.__schema");
  return schema as GraphQLIntrospectionSchema;
}

export function rootGraphQLTypes(schema?: GraphQLIntrospectionSchema) {
  if (!schema) return [];
  return [
    schema.queryType?.name
      ? { label: "Query", type: typeByName(schema, schema.queryType.name) }
      : undefined,
    schema.mutationType?.name
      ? {
          label: "Mutation",
          type: typeByName(schema, schema.mutationType.name),
        }
      : undefined,
    schema.subscriptionType?.name
      ? {
          label: "Subscription",
          type: typeByName(schema, schema.subscriptionType.name),
        }
      : undefined,
  ].filter((item): item is { label: string; type: GraphQLIntrospectionType } => !!item?.type);
}

export function publicGraphQLTypes(schema?: GraphQLIntrospectionSchema) {
  return (schema?.types ?? [])
    .filter((type) => type.name && !type.name.startsWith("__"))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function typeByName(schema: GraphQLIntrospectionSchema, name: string) {
  return schema.types.find((type) => type.name === name);
}

export function formatGraphQLTypeRef(type: GraphQLIntrospectionTypeRef): string {
  if (type.kind === "NON_NULL" && type.ofType) return `${formatGraphQLTypeRef(type.ofType)}!`;
  if (type.kind === "LIST" && type.ofType) return `[${formatGraphQLTypeRef(type.ofType)}]`;
  return type.name ?? type.kind;
}

export function namedGraphQLType(type: GraphQLIntrospectionTypeRef): string | undefined {
  if (type.name) return type.name;
  return type.ofType ? namedGraphQLType(type.ofType) : undefined;
}

export function graphQLFieldSnippet(field: GraphQLIntrospectionField) {
  const args = (field.args ?? [])
    .filter((arg) => !arg.defaultValue)
    .map((arg) => `${arg.name}: ${placeholderForType(arg.type)}`)
    .join(", ");
  return `${field.name}${args ? `(${args})` : ""}`;
}

export function graphQLAutocompleteFields(
  schema: GraphQLIntrospectionSchema | undefined,
  typeName: string,
) {
  if (!schema) return [];
  return (typeByName(schema, typeName)?.fields ?? []).map((field) => ({
    label: field.name,
    detail: formatGraphQLTypeRef(field.type),
    snippet: graphQLFieldSnippet(field),
  }));
}

function placeholderForType(type: GraphQLIntrospectionTypeRef): string {
  const named = namedGraphQLType(type)?.toLowerCase() ?? "";
  if (named.includes("int") || named.includes("float")) return "0";
  if (named.includes("boolean")) return "false";
  return '""';
}
