import { useEffect, useMemo, useRef, useState } from "react";
import {
  GRAPHQL_INTROSPECTION_QUERY,
  parseGraphQLIntrospection,
  publicGraphQLTypes,
  typeByName,
  type GraphQLIntrospectionSchema,
} from "@invoke/core";
import { useStore } from "../../../store";
import { cacheSchema } from "../utils/cache";
import {
  extractFragmentDefs,
  loadFragments,
  saveFragments,
} from "../utils/fragments";
import { schemaToSDL } from "../utils/sdl";
import { mergeFragments, refreshMessage } from "../utils/schemaModal";
import { FragmentsPanel } from "./FragmentsPanel";
import { GraphQLSchemaModalHeader } from "./GraphQLSchemaModalHeader";
import { GraphQLTypesView } from "./GraphQLTypesView";

export function GraphQLSchemaModal({
  schema,
  onClose,
  onInsertField,
}: {
  schema: GraphQLIntrospectionSchema;
  onClose: () => void;
  onInsertField: (snippet: string) => void;
}) {
  const {
    graphqlRequest,
    graphqlSchemaEndpoint,
    graphqlSchemaLastFetched,
    request,
    set,
    addToast,
  } = useStore();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"types" | "sdl" | "frags">("types");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fragments, setFragments] = useState(loadFragments);
  const refreshAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const allTypes = useMemo(() => publicGraphQLTypes(schema), [schema]);
  const filteredTypes = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allTypes;
    return allTypes.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.fields?.some((f) => f.name.toLowerCase().includes(q)) ||
        t.enumValues?.some((v) => v.name.toLowerCase().includes(q)) ||
        t.inputFields?.some((f) => f.name.toLowerCase().includes(q)),
    );
  }, [allTypes, search]);
  const activeType = selectedType ? typeByName(schema, selectedType) : undefined;
  const sdlText = useMemo(
    () => (view === "sdl" ? schemaToSDL(schema) : ""),
    [view, schema],
  );

  const handleRefresh = async () => {
    const endpoint = graphqlSchemaEndpoint || request.url.trim();
    if (refreshing) return;
    if (!endpoint) {
      addToast("error", "No endpoint to refresh from");
      return;
    }
    refreshAbortRef.current?.abort();
    const abortController = new AbortController();
    refreshAbortRef.current = abortController;
    setRefreshing(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(
            (request.headers ?? [])
              .filter((h) => h.enabled !== false && h.key)
              .map((h) => [h.key, h.value]),
          ),
        },
        body: JSON.stringify({ query: GRAPHQL_INTROSPECTION_QUERY }),
        signal: abortController.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newSchema = parseGraphQLIntrospection(await res.text());
      const lastFetched = Date.now();
      set({
        graphqlSchema: newSchema,
        graphqlSchemaStatus: "Schema refreshed",
        graphqlSchemaEndpoint: endpoint,
        graphqlSchemaLastFetched: lastFetched,
      });
      cacheSchema(endpoint, newSchema, lastFetched);
      addToast("success", refreshMessage(schema, newSchema));
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        addToast(
          "error",
          `Refresh failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-pop)] flex flex-col overflow-hidden"
        style={{
          width: 880,
          maxWidth: "calc(100vw - 48px)",
          height: 580,
          maxHeight: "calc(100vh - 64px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <GraphQLSchemaModalHeader
          view={view}
          search={search}
          lastFetched={graphqlSchemaLastFetched}
          refreshing={refreshing}
          onViewChange={setView}
          onSearchChange={setSearch}
          onRefresh={handleRefresh}
          onClose={onClose}
        />
        <div className="flex flex-1 overflow-hidden min-h-0">
          {view === "types" && (
            <GraphQLTypesView
              schema={schema}
              filteredTypes={filteredTypes}
              selectedType={selectedType}
              activeType={activeType}
              onSelectType={setSelectedType}
              onInsertField={onInsertField}
            />
          )}
          {view === "sdl" && (
            <div className="flex-1 overflow-auto">
              <pre className="text-xs font-mono text-[var(--text-2)] p-5 whitespace-pre-wrap break-words leading-relaxed">
                {sdlText}
              </pre>
            </div>
          )}
          {view === "frags" && (
            <FragmentsPanel
              fragments={fragments}
              onInsert={(frag) => onInsertField(`\n${frag.body}`)}
              onDelete={(id) => {
                const updated = fragments.filter((f) => f.id !== id);
                setFragments(updated);
                persistFragments(updated, addToast);
              }}
              onSaveFromQuery={() => {
                const updated = mergeFragments(
                  fragments,
                  extractFragmentDefs(graphqlRequest.query ?? ""),
                );
                setFragments(updated);
                persistFragments(updated, addToast);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function persistFragments(
  fragments: Parameters<typeof saveFragments>[0],
  addToast: (kind: "error", message: string) => void,
) {
  try {
    saveFragments(fragments);
  } catch (error) {
    addToast(
      "error",
      `Failed to save fragments: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
