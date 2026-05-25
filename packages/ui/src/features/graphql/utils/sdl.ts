import {
  buildASTSchema,
  buildClientSchema,
  getIntrospectionQuery,
  graphqlSync,
  parse as gqlParse,
  printSchema,
} from "graphql";
import {
  parseGraphQLIntrospection,
  type GraphQLIntrospectionSchema,
} from "@invoke/core";

export function schemaToSDL(schema: GraphQLIntrospectionSchema): string {
  try {
    const built = buildClientSchema({ __schema: schema } as any);
    return printSchema(built);
  } catch (e) {
    return `# Error generating SDL\n# ${e instanceof Error ? e.message : String(e)}`;
  }
}

export function sdlToIntrospectionSchema(
  sdl: string,
): GraphQLIntrospectionSchema {
  const schema = buildASTSchema(gqlParse(sdl));
  const result = graphqlSync({
    schema,
    source: getIntrospectionQuery(),
  }) as any;
  return parseGraphQLIntrospection(JSON.stringify(result));
}
