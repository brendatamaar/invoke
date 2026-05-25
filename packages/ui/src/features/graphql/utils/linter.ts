import type { RefObject } from "react";
import { buildClientSchema, parse as gqlParse, validate } from "graphql";
import { linter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import type { GraphQLIntrospectionSchema } from "@invoke/core";

export function makeGraphQLLinter(
  schemaRef: RefObject<GraphQLIntrospectionSchema | undefined>,
) {
  return linter(
    (view) => {
      const schema = schemaRef.current;
      if (!schema) return [];
      const query = view.state.doc.toString().trim();
      if (!query) return [];

      const diagnostics: Diagnostic[] = [];
      const locToPos = (line: number, col: number): number => {
        try {
          const ln = view.state.doc.line(line);
          return Math.min(ln.from + col - 1, ln.to);
        } catch {
          return 0;
        }
      };

      let ast;
      try {
        ast = gqlParse(query);
      } catch (e: any) {
        const loc = e.locations?.[0];
        const from = loc ? locToPos(loc.line, loc.column) : 0;
        diagnostics.push({
          from,
          to: Math.min(from + 1, view.state.doc.length),
          severity: "error",
          message: e.message ?? "GraphQL parse error",
        });
        return diagnostics;
      }

      try {
        const gqlSchema = buildClientSchema({ __schema: schema } as any);
        const errors = validate(gqlSchema, ast);
        for (const err of errors) {
          const loc = err.locations?.[0];
          const from = loc ? locToPos(loc.line, loc.column) : 0;
          diagnostics.push({
            from,
            to: Math.min(from + 1, view.state.doc.length),
            severity: "error",
            message: err.message,
          });
        }
      } catch {
        /* skip validation when schema build fails */
      }

      return diagnostics;
    },
    { delay: 700 },
  );
}
