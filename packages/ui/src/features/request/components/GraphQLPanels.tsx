import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FileUp, Link2, X } from "lucide-react";
import {
  GRAPHQL_INTROSPECTION_QUERY,
  formatGraphQLTypeRef,
  parseGraphQLIntrospection,
  publicGraphQLTypes,
  resolveTemplate,
  variablesFromScopes,
  type VariableScope,
} from "@invoke/core";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { VariableAutocompleteInput } from "../../../components/shared/VariableAutocompleteInput";
import { useStore } from "../../../store";
import type { GraphQLSchemaImportSource } from "../../../types";

export function GraphQLQueryPanel() {
  const {
    graphqlRequest,
    setGraphqlRequest,
    graphqlSchema,
    expandedGraphQLTypeNames,
    set,
  } = useStore();
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  const toggleType = (name: string) => {
    set((state) => ({
      expandedGraphQLTypeNames: state.expandedGraphQLTypeNames.includes(name)
        ? state.expandedGraphQLTypeNames.filter((typeName) => typeName !== name)
        : [...state.expandedGraphQLTypeNames, name],
    }));
  };

  const insertField = (fieldName: string) => {
    const current = graphqlRequest.query ?? "";
    const suffix = current && !current.endsWith("\n") ? "\n" : "";
    setGraphqlRequest({ query: current + suffix + `  ${fieldName}\n` });
  };

  const schemaTypes = graphqlSchema ? publicGraphQLTypes(graphqlSchema) : [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <button
          onClick={() => setSchemaModalOpen(true)}
          className="btn text-2xs py-0.5 px-2 gap-1"
        >
          <FileUp size={12} />
          Import Schema
        </button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <CodeEditor
            value={graphqlRequest.query ?? ""}
            onChange={(value) => setGraphqlRequest({ query: value })}
            lang="javascript"
            minHeight="200px"
          />
        </div>
        {graphqlSchema && (
          <div className="w-52 border-l border-[var(--border)] flex flex-col overflow-hidden bg-[var(--surface-2)]">
            <div className="px-2 py-1.5 border-b border-[var(--border)] shrink-0">
              <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
                Schema
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {schemaTypes.map((type) => {
                const expanded = expandedGraphQLTypeNames.includes(type.name);
                return (
                  <div key={type.name}>
                    <button
                      onClick={() => toggleType(type.name)}
                      className="w-full flex items-center gap-1 px-2 py-1 hover:bg-[var(--border)] text-left"
                    >
                      {expanded ? (
                        <ChevronDown size={11} />
                      ) : (
                        <ChevronRight size={11} />
                      )}
                      <span className="text-2xs font-mono text-[var(--accent)] truncate">
                        {type.name}
                      </span>
                    </button>
                    {expanded &&
                      type.fields?.map((field) => (
                        <button
                          key={field.name}
                          onClick={() => insertField(field.name)}
                          className="w-full flex items-center gap-1 pl-5 pr-2 py-0.5 hover:bg-[var(--border)] text-left"
                          title={`${field.name}: ${formatGraphQLTypeRef(field.type)}`}
                        >
                          <span className="text-2xs font-mono text-[var(--text-1)] truncate flex-1">
                            {field.name}
                          </span>
                          <span className="text-2xs text-[var(--text-3)] truncate ml-1">
                            {formatGraphQLTypeRef(field.type)}
                          </span>
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <GraphQLSchemaImportModal
        open={schemaModalOpen}
        onClose={() => setSchemaModalOpen(false)}
      />
    </div>
  );
}

function graphQLSchemaStatusClass(status: string) {
  if (status.startsWith("Failed")) return "text-[var(--danger)]";
  if (status.startsWith("Missing")) return "text-[var(--warn)]";
  return "text-[var(--text-3)]";
}

function graphQLSchemaFailureStatus(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return `Failed: ${message}`;
}

function GraphQLSchemaImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    request,
    set,
    graphqlSchemaStatus,
    environments,
    activeEnvironmentId,
    sessionVariables,
  } = useStore();
  const [source, setSource] = useState<GraphQLSchemaImportSource>("url");
  const [schemaUrl, setSchemaUrl] = useState("");
  const [working, setWorking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setSource("url");
    setWorking(false);
  }, [open]);

  if (!open) return null;

  const close = () => {
    if (!working) onClose();
  };

  const resolveSchemaUrlAndHeaders = () => {
    const env = environments.find((environment) => environment.id === activeEnvironmentId);
    const scopes: VariableScope[] = [
      { name: "environment", variables: env?.variables ?? [] },
      { name: "session", variables: sessionVariables },
    ];
    const variables = variablesFromScopes(scopes);
    const unresolved = new Set<string>();
    const resolve = (value: string) => {
      const resolved = resolveTemplate(value, variables);
      resolved.unresolved.forEach((name) => unresolved.add(name));
      return resolved.value;
    };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    request.headers?.forEach((header) => {
      if (header.enabled !== false && header.key)
        headers[resolve(header.key)] = resolve(header.value);
    });
    return {
      url: resolve(schemaUrl.trim()),
      headers,
      unresolved: [...unresolved],
    };
  };

  const loadSchema = (body: string) => {
    const schema = parseGraphQLIntrospection(body);
    set({ graphqlSchema: schema, graphqlSchemaStatus: "Schema loaded" });
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
      loadSchema(body);
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
      loadSchema(await file.text());
    } catch (e) {
      set({ graphqlSchemaStatus: graphQLSchemaFailureStatus(e) });
    } finally {
      setWorking(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col"
        style={{ width: 520, maxWidth: "calc(100vw - 32px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <FileUp size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">Import Schema</span>
          <button
            onClick={close}
            disabled={working}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)] disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-1">
            {(["url", "file"] as GraphQLSchemaImportSource[]).map((option) => (
              <button
                key={option}
                onClick={() => setSource(option)}
                className={`tab-btn text-2xs ${source === option ? "active" : ""}`}
              >
                {option === "url" ? "URL" : "Local JSON"}
              </button>
            ))}
          </div>

          {source === "url" ? (
            <div className="flex flex-col gap-2">
              <label className="text-2xs text-[var(--text-3)]">
                GraphQL endpoint
              </label>
              <VariableAutocompleteInput
                value={schemaUrl}
                onChange={setSchemaUrl}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                    fetchSchema();
                }}
                placeholder="https://api.example.com/graphql"
                className="input text-xs py-1.5 font-mono"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => importSchemaFile(e.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={working}
                className="btn text-xs gap-1.5"
              >
                <FileUp size={13} />
                Choose JSON
              </button>
            </div>
          )}

          {graphqlSchemaStatus && (
            <p
              className={`px-1 text-2xs whitespace-pre-wrap break-words ${graphQLSchemaStatusClass(graphqlSchemaStatus)}`}
            >
              {graphqlSchemaStatus}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button onClick={close} disabled={working} className="btn text-xs">
            Cancel
          </button>
          {source === "url" && (
            <button
              onClick={fetchSchema}
              disabled={working || !schemaUrl.trim()}
              className="btn btn-primary text-xs gap-1.5"
            >
              <Link2 size={13} />
              {working ? "Fetching..." : "Fetch Schema"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
