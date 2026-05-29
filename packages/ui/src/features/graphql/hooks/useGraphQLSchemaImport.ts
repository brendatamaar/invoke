import { useRef, useState } from "react";
import {
  GRAPHQL_INTROSPECTION_QUERY,
  parseGraphQLIntrospection,
  resolveTemplate,
  variablesFromScopes,
  type GraphQLIntrospectionSchema,
  type VariableScope,
} from "@invoke/core";
import type { GraphQLSchemaImportSource } from "../../../types";
import { useStore } from "../../../store";
import { cacheSchema } from "../utils/cache";
import { graphQLSchemaFailureStatus } from "../utils/badges";
import { sdlToIntrospectionSchema } from "../utils/sdl";

export function useGraphQLSchemaImport(open: boolean, onClose: () => void) {
  const {
    request,
    set,
    graphqlSchemaEndpoint,
    environments,
    activeEnvironmentId,
    sessionVariables,
  } = useStore();
  const [source, setSource] = useState<GraphQLSchemaImportSource>("url");
  const [schemaUrl, setSchemaUrl] = useState(graphqlSchemaEndpoint ?? "");
  const [sdlText, setSdlText] = useState("");
  const [working, setWorking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sdlFileInputRef = useRef<HTMLInputElement | null>(null);
  const schemaUrlRef = useRef(schemaUrl);
  schemaUrlRef.current = schemaUrl;

  const close = () => {
    if (!working) onClose();
  };

  const resolveSchemaUrlAndHeaders = () => {
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const scopes: VariableScope[] = [
      { name: "environment", variables: env?.variables ?? [] },
      { name: "session", variables: sessionVariables },
    ];
    const variables = variablesFromScopes(scopes);
    const unresolved = new Set<string>();
    const resolve = (value: string) => {
      const r = resolveTemplate(value, variables);
      r.unresolved.forEach((n) => unresolved.add(n));
      return r.value;
    };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    request.headers?.forEach((h) => {
      if (h.enabled !== false && h.key) headers[resolve(h.key)] = resolve(h.value);
    });
    return { url: resolve(schemaUrl.trim()), headers, unresolved: [...unresolved] };
  };

  const commitSchema = (schema: GraphQLIntrospectionSchema, endpoint: string) => {
    const lastFetched = Date.now();
    cacheSchema(endpoint, schema, lastFetched);
    set({
      graphqlSchema: schema,
      graphqlSchemaStatus: "Schema loaded",
      graphqlSchemaEndpoint: endpoint,
      graphqlSchemaLastFetched: lastFetched,
    });
    onClose();
  };

  const fetchSchema = async () => {
    if (!schemaUrl.trim() || working) return;
    const { url, headers, unresolved } = resolveSchemaUrlAndHeaders();
    if (unresolved.length > 0) {
      set({
        graphqlSchemaStatus: `Missing variables: ${unresolved.slice(0, 5).join(", ")}`,
      });
      return;
    }
    setWorking(true);
    set({ graphqlSchemaStatus: "Fetching schema..." });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: GRAPHQL_INTROSPECTION_QUERY }),
      });
      const body = await res.text();
      if (!res.ok) {
        set({
          graphqlSchemaStatus: `Failed: HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`,
        });
        return;
      }
      commitSchema(parseGraphQLIntrospection(body), url);
    } catch (e) {
      set({ graphqlSchemaStatus: graphQLSchemaFailureStatus(e) });
    } finally {
      setWorking(false);
    }
  };

  const importSchemaFile = async (file: File | undefined) => {
    if (!file || working) return;
    setWorking(true);
    set({ graphqlSchemaStatus: "Importing schema..." });
    try {
      commitSchema(parseGraphQLIntrospection(await file.text()), "");
    } catch (e) {
      set({ graphqlSchemaStatus: graphQLSchemaFailureStatus(e) });
    } finally {
      setWorking(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const importSDLFile = async (file: File | undefined) => {
    if (!file || working) return;
    setWorking(true);
    set({ graphqlSchemaStatus: "Importing SDL..." });
    try {
      commitSchema(sdlToIntrospectionSchema(await file.text()), "");
    } catch (e) {
      set({ graphqlSchemaStatus: graphQLSchemaFailureStatus(e) });
    } finally {
      setWorking(false);
      if (sdlFileInputRef.current) sdlFileInputRef.current.value = "";
    }
  };

  const importSDLText = () => {
    if (!sdlText.trim() || working) return;
    setWorking(true);
    set({ graphqlSchemaStatus: "Importing SDL..." });
    try {
      commitSchema(sdlToIntrospectionSchema(sdlText.trim()), "");
    } catch (e) {
      set({ graphqlSchemaStatus: graphQLSchemaFailureStatus(e) });
      setWorking(false);
    }
  };

  return {
    source,
    schemaUrl,
    sdlText,
    working,
    fileInputRef,
    sdlFileInputRef,
    close,
    setSource,
    setSchemaUrl,
    setSdlText,
    fetchSchema,
    importSchemaFile,
    importSDLFile,
    importSDLText,
  };
}
