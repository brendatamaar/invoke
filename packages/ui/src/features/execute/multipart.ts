import type { ExecuteResponse } from "@invoke/core";
import type { GraphQLDeferredPart } from "../../types";

export function extractMultipartBoundary(contentType: string): string | null {
  const m = contentType.match(/boundary=([^\s;,"]+|"[^"]*")/i);
  if (!m) return null;
  return m[1].replace(/^"|"$/g, "");
}

function splitPartBody(raw: string): string {
  const crlfBlank = raw.indexOf("\r\n\r\n");
  const lfBlank = raw.indexOf("\n\n");
  const sep = crlfBlank !== -1 ? crlfBlank + 4 : lfBlank !== -1 ? lfBlank + 2 : 0;
  return raw.slice(sep).trim();
}

export function parseMultipartMixed(rawBody: string, boundary: string): GraphQLDeferredPart[] {
  const delimiter = "--" + boundary;
  const parts: GraphQLDeferredPart[] = [];
  const sections = rawBody.split(delimiter);

  let partIndex = 0;
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    if (!section.trim() || section.trim() === "--") continue;

    const body = splitPartBody(section);
    if (!body) continue;

    try {
      const payload = JSON.parse(body) as {
        data?: unknown;
        errors?: unknown[];
        hasNext?: boolean;
        incremental?: {
          data?: unknown;
          path?: (string | number)[];
          errors?: unknown[];
          label?: string;
        }[];
      };

      if (partIndex === 0) {
        parts.push({
          partIndex: 0,
          data: payload.data,
          errors: payload.errors,
          hasNext: payload.hasNext ?? true,
        });
      } else {
        const incs = payload.incremental ?? [];
        if (incs.length === 0) {
          parts.push({ partIndex, hasNext: payload.hasNext ?? false });
        } else {
          for (const inc of incs) {
            parts.push({
              partIndex,
              path: inc.path,
              data: inc.data,
              errors: inc.errors,
              hasNext: payload.hasNext ?? false,
              label: inc.label,
            });
          }
        }
      }
    } catch {
      // skip unparseable parts
    }
    partIndex++;
  }

  return parts;
}

function setAtPath(
  root: Record<string, unknown>,
  path: (string | number)[],
  data: Record<string, unknown>,
): void {
  if (path.length === 0) {
    Object.assign(root, data);
    return;
  }
  let cur: unknown = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (cur == null || typeof cur !== "object") return;
    const key = path[i];
    cur = Array.isArray(cur)
      ? (cur as unknown[])[Number(key)]
      : (cur as Record<string, unknown>)[String(key)];
  }
  if (cur == null || typeof cur !== "object") return;
  const lastKey = path[path.length - 1];
  if (Array.isArray(cur)) {
    const idx = Number(lastKey);
    const existing = (cur as unknown[])[idx];
    (cur as unknown[])[idx] =
      existing != null && typeof existing === "object"
        ? { ...(existing as object), ...data }
        : data;
  } else {
    const key = String(lastKey);
    const existing = (cur as Record<string, unknown>)[key];
    (cur as Record<string, unknown>)[key] =
      existing != null && typeof existing === "object"
        ? { ...(existing as object), ...data }
        : data;
  }
}

export function mergeIncrementalParts(parts: GraphQLDeferredPart[]): string {
  if (parts.length === 0) return "{}";
  const first = parts.find((p) => p.partIndex === 0);
  const merged: { data: Record<string, unknown>; errors?: unknown[] } = {
    data: (first?.data ?? {}) as Record<string, unknown>,
    ...(first?.errors?.length ? { errors: first.errors } : {}),
  };
  for (const part of parts) {
    if (part.partIndex === 0) continue;
    if (part.data != null && part.path) {
      setAtPath(merged.data, part.path, part.data as Record<string, unknown>);
    }
    if (part.errors?.length) {
      merged.errors = [...(merged.errors ?? []), ...part.errors];
    }
  }
  return JSON.stringify(merged);
}

export function processMultipartResponse(response: ExecuteResponse): {
  response: ExecuteResponse;
  parts: GraphQLDeferredPart[] | null;
} {
  const ctHeader = response.headers.find((h) => h.key.toLowerCase() === "content-type");
  const ct = ctHeader?.value ?? "";
  if (!ct.includes("multipart/mixed")) return { response, parts: null };

  const boundary = extractMultipartBoundary(ct);
  if (!boundary) return { response, parts: null };

  const parts = parseMultipartMixed(response.body, boundary);
  if (parts.length === 0) return { response, parts: null };

  return {
    response: { ...response, body: mergeIncrementalParts(parts) },
    parts,
  };
}
