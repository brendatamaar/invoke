import SwaggerParser from "@apidevtools/swagger-parser";
import yaml from "js-yaml";
import { emptyRequest, id, toRequestConfig } from "../request";
import type {
  Collection,
  Environment,
  Folder,
  HttpMethod,
  KeyValue,
  RequestConfig,
  SavedRequest,
} from "../types";

const EXTERNAL_REF_ERROR = "external $ref not supported in browser context";

export async function importOpenApiSpec(
  input: string | Record<string, unknown>,
  sourceName = "OpenAPI import",
) {
  try {
    const rawDoc = typeof input === "string" ? parseYamlDocument(input) : input;
    assertOpenApiDocument(rawDoc);
    assertNoExternalRefs(rawDoc);
    const doc = (await SwaggerParser.dereference(clonePlain(rawDoc), {
      resolve: { external: false },
    } as SwaggerParser.Options)) as any;
    assertOpenApiDocument(doc);

    const now = Date.now();
    const collection: Collection = {
      id: id(),
      name: doc.info?.title ?? sourceName,
      description: doc.info?.description,
      variables: [],
      sortOrder: now,
      createdAt: now,
      updatedAt: now,
    };
    const environments = environmentsFromServers(doc, now);
    const serverUrl = environments.length > 0 ? "{{base_url}}" : normalizeServerUrl("");
    const foldersByTag = new Map<string, Folder>();
    const requests: SavedRequest[] = [];
    const methods = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);

    for (const [rawPath, pathItem] of Object.entries(doc.paths ?? {})) {
      if (!pathItem || typeof pathItem !== "object") continue;
      for (const [rawMethod, operation] of Object.entries(pathItem as Record<string, any>)) {
        if (!methods.has(rawMethod) || !operation || typeof operation !== "object") continue;

        const tag = operation.tags?.[0] ? String(operation.tags[0]) : "";
        const folder = tag
          ? folderForTag(collection.id, foldersByTag, tag, now + foldersByTag.size)
          : undefined;
        const parameters = [
          ...((pathItem as any).parameters ?? []),
          ...(operation.parameters ?? []),
        ];
        const path = pathWithVariables(rawPath);
        const request = toRequestConfig({
          ...emptyRequest(),
          method: rawMethod.toUpperCase() as HttpMethod,
          url: `${serverUrl}${path}`,
          params: parameters
            .filter((parameter) => parameter?.in === "query")
            .map((parameter) => ({
              key: parameter.name,
              value: `{{${parameter.name}}}`,
              enabled: true,
            })),
          headers: parameters
            .filter((parameter) => parameter?.in === "header")
            .map((parameter) => ({
              key: parameter.name,
              value: `{{${parameter.name}}}`,
              enabled: true,
            })),
          bodyMode: operation.requestBody ? "json" : "none",
          body: operation.requestBody
            ? JSON.stringify(exampleFromRequestBody(operation.requestBody), null, 2)
            : "",
          timeoutMs: 30000,
        });
        requests.push({
          id: id(),
          collectionId: collection.id,
          folderId: folder?.id ?? null,
          name: operation.operationId ?? operation.summary ?? `${request.method} ${rawPath}`,
          protocol: "rest",
          request,
          sortOrder: now + requests.length,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      collection,
      folders: [...foldersByTag.values()],
      requests,
      environments,
    };
  } catch (error) {
    throw openApiImportError(error);
  }
}

export function exportCollectionAsOpenApi(
  collection: Collection,
  requests: SavedRequest[],
  folders: Folder[] = [],
): string {
  const foldersById = new Map(folders.map((f) => [f.id, f]));
  const colRequests = requests.filter(
    (r) => r.collectionId === collection.id && r.protocol === "rest",
  );

  const SKIP_HEADERS = new Set(["content-type", "accept", "authorization", "content-length"]);

  const paths: Record<string, Record<string, unknown>> = {};

  for (const saved of colRequests) {
    const req = saved.request as RequestConfig;
    if (!req.url) continue;

    let urlPath = "/";
    try {
      urlPath = decodeURIComponent(new URL(req.url).pathname || "/");
    } catch {
      urlPath = req.url.startsWith("/") ? req.url : `/${req.url}`;
    }
    urlPath = urlPath.replace(/\{\{([^}]+)\}\}/g, "{$1}");

    const method = req.method.toLowerCase();
    if (!paths[urlPath]) paths[urlPath] = {};

    const folderName = saved.folderId ? foldersById.get(saved.folderId)?.name : undefined;

    const pathParams = pathParameterNames(urlPath);
    const parameters: unknown[] = pathParams.map((name) => ({
      name,
      in: "path",
      required: true,
      schema: { type: "string" },
    }));

    parameters.push(
      ...(req.params ?? [])
        .filter((p) => p.enabled !== false && p.key)
        .map((p) => ({
          name: p.key,
          in: "query",
          schema: { type: "string" },
          example: p.value,
        })),
    );

    for (const h of (req.headers ?? []).filter(
      (h) => h.enabled !== false && h.key && !SKIP_HEADERS.has(h.key.toLowerCase()),
    )) {
      parameters.push({
        name: h.key,
        in: "header",
        schema: { type: "string" },
        example: h.value,
      });
    }

    const operation: Record<string, unknown> = {
      summary: saved.name,
      operationId: openApiOperationId(saved.name, req.method, urlPath),
      ...(folderName ? { tags: [folderName] } : {}),
      ...(parameters.length ? { parameters } : {}),
      responses: { "200": { description: "OK" } },
    };

    if (req.bodyMode !== "none" && req.body) {
      const mimeByMode: Record<string, string> = {
        json: "application/json",
        urlencoded: "application/x-www-form-urlencoded",
        "form-data": "multipart/form-data",
        raw: "text/plain",
      };
      const contentType = mimeByMode[req.bodyMode] ?? "text/plain";
      operation.requestBody = {
        content: {
          [contentType]: {
            schema: { type: "string" },
            example: openApiBodyExample(req),
          },
        },
      };
    }

    paths[urlPath][method] = operation;
  }

  const tagNames = [
    ...new Set(
      colRequests
        .filter((r) => r.folderId)
        .map((r) => foldersById.get(r.folderId!)?.name)
        .filter((n): n is string => Boolean(n)),
    ),
  ];

  const spec: Record<string, unknown> = {
    openapi: "3.0.3",
    info: {
      title: collection.name,
      ...(collection.description ? { description: collection.description } : {}),
      version: "1.0.0",
    },
    ...(tagNames.length ? { tags: tagNames.map((name) => ({ name })) } : {}),
    paths,
  };

  return yaml.dump(spec, { lineWidth: 120 });
}

function parseYamlDocument(content: string) {
  return yaml.load(content, { schema: yaml.JSON_SCHEMA }) as any;
}

function pathParameterNames(path: string) {
  return [...path.matchAll(/\{([^}/]+)\}/g)].map((match) => match[1]);
}

function openApiOperationId(name: string, method: HttpMethod, path: string) {
  const base = `${method.toLowerCase()} ${name || path}`
    .replace(/\{\{?([^}]+)\}?\}/g, "$1")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr: string) => chr.toUpperCase())
    .replace(/^[^a-zA-Z]+/, "");
  return base ? `${base[0].toLowerCase()}${base.slice(1)}` : method.toLowerCase();
}

function openApiBodyExample(request: RequestConfig) {
  if (request.bodyMode === "json") {
    try {
      return JSON.parse(request.body);
    } catch {
      return request.body;
    }
  }
  if (request.bodyMode === "urlencoded" || request.bodyMode === "form-data") {
    try {
      const rows = JSON.parse(request.body) as KeyValue[];
      return Object.fromEntries(
        rows.filter((row) => row.enabled !== false && row.key).map((row) => [row.key, row.value]),
      );
    } catch {
      return request.body;
    }
  }
  return request.body;
}

function normalizeServerUrl(value: string) {
  const trimmed = String(value ?? "").replace(/\/$/, "");
  return trimmed || "{{base_url}}";
}

function environmentsFromServers(doc: any, now: number): Environment[] {
  const servers = Array.isArray(doc.servers) ? doc.servers : [];
  return servers
    .filter((server: any) => typeof server?.url === "string" && server.url.trim())
    .map((server: any, index: number) => ({
      id: id(),
      name: server.description || `${doc.info?.title ?? "OpenAPI"} server ${index + 1}`,
      variables: [
        {
          key: "base_url",
          value: normalizeServerUrl(server.url),
          enabled: true,
        },
      ],
      createdAt: now + index,
      updatedAt: now + index,
    }));
}

function pathWithVariables(path: string) {
  return path.replace(/\{([^}]+)\}/g, (_match, name: string) => `{{${name.trim()}}}`);
}

function folderForTag(
  collectionId: string,
  folders: Map<string, Folder>,
  tag: string,
  sortOrder: number,
) {
  const existing = folders.get(tag);
  if (existing) return existing;
  const now = Date.now();
  const folder: Folder = {
    id: id(),
    collectionId,
    parentFolderId: null,
    name: tag,
    variables: [],
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  folders.set(tag, folder);
  return folder;
}

function exampleFromRequestBody(requestBody: any) {
  const content = requestBody?.content ?? {};
  const json = content["application/json"] ?? Object.values(content)[0];
  const firstExample = Object.values(json?.examples ?? {})[0] as { value?: unknown } | undefined;
  return json?.example ?? firstExample?.value ?? exampleFromSchema(json?.schema);
}

function exampleFromSchema(schema: any, stack = new WeakSet<object>()): unknown {
  if (!schema || typeof schema !== "object") return {};
  if (stack.has(schema)) return {};
  stack.add(schema);

  try {
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum?.length) return schema.enum[0];

    const allOfExamples = Array.isArray(schema.allOf)
      ? schema.allOf.map((part: any) => exampleFromSchema(part, stack))
      : [];
    const ownProperties = Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, property]) => [
        key,
        exampleFromSchema(property, stack),
      ]),
    );
    const type = schema.type ?? (schema.properties || allOfExamples.length ? "object" : undefined);

    if (type === "object") {
      return mergeExampleObjects([...allOfExamples, ownProperties]);
    }
    if (type === "array") return [exampleFromSchema(schema.items, stack)];
    if (type === "integer" || type === "number") return 0;
    if (type === "boolean") return true;
    if (type === "string") return "string";
    return firstDefined(allOfExamples) ?? {};
  } finally {
    stack.delete(schema);
  }
}

function mergeExampleObjects(values: unknown[]) {
  const result: Record<string, unknown> = {};
  for (const value of values) {
    if (!isPlainObject(value)) continue;
    for (const [key, raw] of Object.entries(value)) {
      result[key] =
        isPlainObject(result[key]) && isPlainObject(raw)
          ? mergeExampleObjects([result[key], raw])
          : raw;
    }
  }
  return result;
}

function firstDefined(values: unknown[]) {
  return values.find((value) => value !== undefined);
}

function assertOpenApiDocument(doc: any) {
  if (!isPlainObject(doc) || typeof doc.openapi !== "string" || !doc.openapi.startsWith("3.")) {
    throw new Error("Only OpenAPI 3.x documents are supported");
  }
  if (!isPlainObject(doc.info) || typeof doc.info.title !== "string" || !doc.info.title.trim()) {
    throw new Error("OpenAPI document is missing required info.title");
  }
  if (!isPlainObject(doc.paths)) {
    throw new Error("OpenAPI document is missing required paths object");
  }
}

function assertNoExternalRefs(value: unknown) {
  if (Array.isArray(value)) {
    value.forEach(assertNoExternalRefs);
    return;
  }
  if (!isPlainObject(value)) return;
  if (typeof value.$ref === "string" && !value.$ref.startsWith("#/")) {
    throw new Error(`${EXTERNAL_REF_ERROR}: ${value.$ref}`);
  }
  Object.values(value).forEach(assertNoExternalRefs);
}

function openApiImportError(error: unknown) {
  if (error instanceof Error) {
    return error.message.startsWith("OpenAPI import failed:")
      ? error
      : new Error(`OpenAPI import failed: ${error.message}`, { cause: error });
  }
  return new Error(`OpenAPI import failed: ${String(error)}`);
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
