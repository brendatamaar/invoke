import { parse as gqlParse, print as gqlPrint } from "graphql";
import type { ParsedOperation } from "../types";

export function prettifyQuery(query: string): { result: string; error?: string } {
  try {
    return { result: gqlPrint(gqlParse(query)) };
  } catch (e) {
    return { result: query, error: e instanceof Error ? e.message : String(e) };
  }
}

export function extractOperations(query: string): ParsedOperation[] {
  try {
    const ast = gqlParse(query);
    return ast.definitions.reduce<ParsedOperation[]>((acc, d) => {
      if (d.kind === "OperationDefinition") {
        acc.push({ name: (d as any).name?.value ?? null, kind: (d as any).operation ?? "query" });
      }
      return acc;
    }, []);
  } catch {
    return [];
  }
}

export function extractQueryVarDefs(query: string): string[] {
  try {
    const ast = gqlParse(query);
    return ast.definitions.reduce<string[]>((acc, d) => {
      if (d.kind === "OperationDefinition") {
        for (const v of ((d as any).variableDefinitions ?? [])) {
          acc.push(v.variable.name.value as string);
        }
      }
      return acc;
    }, []);
  } catch {
    return [];
  }
}

export function extractRequiredVarNames(query: string): string[] {
  try {
    const ast = gqlParse(query);
    return ast.definitions.reduce<string[]>((acc, d) => {
      if (d.kind === "OperationDefinition") {
        for (const v of ((d as any).variableDefinitions ?? [])) {
          if (v.type.kind === "NonNullType" && !v.defaultValue) {
            acc.push(v.variable.name.value as string);
          }
        }
      }
      return acc;
    }, []);
  } catch {
    return [];
  }
}

export function scaffoldVariables(current: string, varNames: string[]): string {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(current);
  } catch {
    /* keep empty */
  }
  let changed = false;
  for (const name of varNames) {
    if (!(name in parsed)) {
      parsed[name] = null;
      changed = true;
    }
  }
  return changed ? JSON.stringify(parsed, null, 2) : current;
}
