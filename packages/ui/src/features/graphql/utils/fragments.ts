import { parse as gqlParse, print as gqlPrint } from "graphql";
import type { SavedFragment } from "../types";

const FRAGMENTS_KEY = "gql_fragments";

export function loadFragments(): SavedFragment[] {
  try {
    const raw = localStorage.getItem(FRAGMENTS_KEY);
    return raw ? (JSON.parse(raw) as SavedFragment[]) : [];
  } catch {
    return [];
  }
}

export function saveFragments(fragments: SavedFragment[]) {
  localStorage.setItem(FRAGMENTS_KEY, JSON.stringify(fragments));
}

export function extractFragmentDefs(query: string): SavedFragment[] {
  const results: SavedFragment[] = [];
  try {
    const ast = gqlParse(query);
    for (const def of ast.definitions) {
      if (def.kind !== "FragmentDefinition") continue;
      results.push({
        id: Math.random().toString(36).slice(2),
        name: def.name.value,
        onType: def.typeCondition.name.value,
        body: gqlPrint(def),
      });
    }
  } catch {
    /* ignore parse errors */
  }
  return results;
}
