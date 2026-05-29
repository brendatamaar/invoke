export interface GraphQLError {
  message: string;
  path?: (string | number)[];
  locations?: { line: number; column: number }[];
  extensions?: { code?: string; [key: string]: unknown };
}

export interface GraphQLCost {
  requestedQueryCost?: number;
  actualQueryCost?: number;
  maximumAvailable?: number;
  throttleStatus?: unknown;
  [key: string]: unknown;
}

export function parseGraphQLErrors(body: string): GraphQLError[] {
  try {
    const parsed = JSON.parse(body) as { errors?: GraphQLError[] } | { errors?: GraphQLError[] }[];
    if (Array.isArray(parsed)) {
      // batched response — collect errors from all items
      return parsed.flatMap((item) => (Array.isArray(item.errors) ? item.errors : []));
    }
    return Array.isArray(parsed.errors) ? parsed.errors : [];
  } catch {
    return [];
  }
}

export function parseGraphQLCost(body: string): {
  cost: GraphQLCost | number | null;
  complexity: number | null;
} {
  try {
    const parsed = JSON.parse(body) as { extensions?: Record<string, unknown> };
    const ext = parsed.extensions;
    if (!ext) return { cost: null, complexity: null };
    const cost = ext.cost != null ? (ext.cost as GraphQLCost | number) : null;
    const complexity = typeof ext.complexity === "number" ? ext.complexity : null;
    return { cost, complexity };
  } catch {
    return { cost: null, complexity: null };
  }
}
