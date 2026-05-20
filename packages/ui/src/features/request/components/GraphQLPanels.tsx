import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "../../../components/shared/Select";
import {
  AlertTriangle,
  ArrowDown,
  Bookmark,
  BookmarkPlus,
  Check,
  ChevronRight,
  Code,
  Copy,
  FileUp,
  Layers,
  Link2,
  SlidersHorizontal,
  RefreshCw,
  Search,
  StopCircle,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  buildASTSchema,
  buildClientSchema,
  getIntrospectionQuery,
  graphqlSync,
  parse as gqlParse,
  print as gqlPrint,
  printSchema,
  validate,
} from "graphql";
import { autocompletion } from "@codemirror/autocomplete";
import type { CompletionContext } from "@codemirror/autocomplete";
import { linter, lintGutter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import {
  GRAPHQL_INTROSPECTION_QUERY,
  formatGraphQLTypeRef,
  generateCodeSnippet,
  graphQLAutocompleteFields,
  graphQLFieldSnippet,
  graphQLToRequestConfig,
  namedGraphQLType,
  parseGraphQLIntrospection,
  publicGraphQLTypes,
  resolveTemplate,
  rootGraphQLTypes,
  typeByName,
  variablesFromScopes,
  type GraphQLIntrospectionSchema,
  type GraphQLIntrospectionType,
  type VariableScope,
} from "@invoke/core";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { VariableAutocompleteInput } from "../../../components/shared/VariableAutocompleteInput";
import { useStore } from "../../../store";
import { applyProtocolDefaults } from "../../../lib/protocolDefaults";
import type { GraphQLSchemaImportSource } from "../../../types";
import { useGraphQLSubscription } from "../useGraphQLSubscription";
import type { GQLSubMessage } from "../useGraphQLSubscription";

// ── persistence helpers ────────────────────────────────────────────────────

const CACHE_PREFIX = "gql_schema_";

function cacheSchema(
  endpoint: string,
  schema: GraphQLIntrospectionSchema,
  lastFetched: number,
) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + endpoint,
      JSON.stringify({ schema, lastFetched }),
    );
  } catch {
    // quota exceeded — ignore
  }
}

function loadCachedSchema(
  endpoint: string,
): { schema: GraphQLIntrospectionSchema; lastFetched: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + endpoint);
    if (!raw) return null;
    return JSON.parse(raw) as {
      schema: GraphQLIntrospectionSchema;
      lastFetched: number;
    };
  } catch {
    return null;
  }
}

function fmtAge(ts: number): string {
  if (!ts) return "";
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ── diff helper (P3.3) ─────────────────────────────────────────────────────

function diffSchemas(
  oldSchema: GraphQLIntrospectionSchema,
  newSchema: GraphQLIntrospectionSchema,
): { added: string[]; removed: string[] } {
  const oldNames = new Set(
    oldSchema.types.filter((t) => !t.name.startsWith("__")).map((t) => t.name),
  );
  const newNames = new Set(
    newSchema.types.filter((t) => !t.name.startsWith("__")).map((t) => t.name),
  );
  return {
    added: [...newNames].filter((n) => !oldNames.has(n)),
    removed: [...oldNames].filter((n) => !newNames.has(n)),
  };
}

// ── query helpers ──────────────────────────────────────────────────────────

function prettifyQuery(query: string): { result: string; error?: string } {
  try {
    return { result: gqlPrint(gqlParse(query)) };
  } catch (e) {
    return { result: query, error: e instanceof Error ? e.message : String(e) };
  }
}

interface ParsedOperation {
  name: string | null;
  kind: string;
}

function extractOperations(query: string): ParsedOperation[] {
  try {
    const ast = gqlParse(query);
    return ast.definitions
      .filter((d) => d.kind === "OperationDefinition")
      .map((d) => ({
        name: (d as any).name?.value ?? null,
        kind: (d as any).operation ?? "query",
      }));
  } catch {
    return [];
  }
}

function extractQueryVarDefs(query: string): string[] {
  try {
    const ast = gqlParse(query);
    return ast.definitions
      .filter((d) => d.kind === "OperationDefinition")
      .flatMap((d) =>
        ((d as any).variableDefinitions ?? []).map(
          (v: any) => v.variable.name.value as string,
        ),
      );
  } catch {
    return [];
  }
}

export function extractRequiredVarNames(query: string): string[] {
  try {
    const ast = gqlParse(query);
    return ast.definitions
      .filter((d) => d.kind === "OperationDefinition")
      .flatMap((d) => (d as any).variableDefinitions ?? [])
      .filter((v: any) => v.type.kind === "NonNullType" && !v.defaultValue)
      .map((v: any) => v.variable.name.value as string);
  } catch {
    return [];
  }
}

function scaffoldVariables(current: string, varNames: string[]): string {
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

// ── SDL helpers ────────────────────────────────────────────────────────────

function schemaToSDL(schema: GraphQLIntrospectionSchema): string {
  try {
    const built = buildClientSchema({ __schema: schema } as any);
    return printSchema(built);
  } catch (e) {
    return `# Error generating SDL\n# ${e instanceof Error ? e.message : String(e)}`;
  }
}

function sdlToIntrospectionSchema(sdl: string): GraphQLIntrospectionSchema {
  const schema = buildASTSchema(gqlParse(sdl));
  const result = graphqlSync({
    schema,
    source: getIntrospectionQuery(),
  }) as any;
  return parseGraphQLIntrospection(JSON.stringify(result));
}

// ── fragments library (P7.1) ──────────────────────────────────────────────

export interface SavedFragment {
  id: string;
  name: string;
  onType: string;
  body: string;
}

const FRAGMENTS_KEY = "gql_fragments";

function loadFragments(): SavedFragment[] {
  try {
    const raw = localStorage.getItem(FRAGMENTS_KEY);
    return raw ? (JSON.parse(raw) as SavedFragment[]) : [];
  } catch {
    return [];
  }
}

function saveFragments(fragments: SavedFragment[]) {
  try {
    localStorage.setItem(FRAGMENTS_KEY, JSON.stringify(fragments));
  } catch {
    /* quota exceeded */
  }
}

function extractFragmentDefs(query: string): SavedFragment[] {
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

// ── linter factory (P4.1) ──────────────────────────────────────────────────

function makeGraphQLLinter(
  schemaRef: React.RefObject<GraphQLIntrospectionSchema | undefined>,
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
        // buildClientSchema failed — skip validation
      }

      return diagnostics;
    },
    { delay: 700 },
  );
}

// ── kind badge ─────────────────────────────────────────────────────────────

function kindBadge(kind: string): { label: string; cls: string } {
  switch (kind) {
    case "OBJECT":
      return { label: "obj", cls: "text-[var(--info)] bg-[var(--info-bg)]" };
    case "INPUT_OBJECT":
      return {
        label: "inp",
        cls: "text-[var(--method-patch)] bg-[rgba(200,156,214,0.1)]",
      };
    case "ENUM":
      return { label: "enum", cls: "text-[var(--warn)] bg-[var(--warn-bg)]" };
    case "UNION":
      return { label: "union", cls: "text-[var(--ok)] bg-[var(--ok-bg)]" };
    case "INTERFACE":
      return { label: "iface", cls: "text-cyan-600 bg-cyan-500/10" };
    case "SCALAR":
      return { label: "scalar", cls: "text-[var(--fg-2)] bg-[var(--bg-3)]" };
    default:
      return {
        label: kind.toLowerCase(),
        cls: "text-[var(--fg-2)] bg-[var(--bg-3)]",
      };
  }
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function GraphQLQueryPanel() {
  const {
    graphqlRequest,
    setGraphqlRequest,
    graphqlSchema,
    request,
    set,
    environments,
    activeEnvironmentId,
    sessionVariables,
    addToast,
  } = useStore();
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [schemaExplorerOpen, setSchemaExplorerOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);
  const curlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (curlTimeoutRef.current) clearTimeout(curlTimeoutRef.current);
    };
  }, []);
  const {
    state: subState,
    messages: subMessages,
    subscribe,
    unsubscribe,
    clearMessages,
  } = useGraphQLSubscription();

  useEffect(() => {
    if (!optionsOpen) return;
    const handler = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node))
        setOptionsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [optionsOpen]);

  const handlePrettify = () => {
    const { result, error } = prettifyQuery(graphqlRequest.query ?? "");
    if (error) { addToast("error", `Cannot prettify: ${error}`); return; }
    setGraphqlRequest({ query: result });
  };

  const copyCurl = async () => {
    try {
      const config = graphQLToRequestConfig({
        ...graphqlRequest,
        url: request.url,
      });
      const snippet = await generateCodeSnippet(
        applyProtocolDefaults(config, "graphql"),
        "curl",
      );
      await navigator.clipboard.writeText(snippet.code);
      setCurlCopied(true);
      if (curlTimeoutRef.current) clearTimeout(curlTimeoutRef.current);
      curlTimeoutRef.current = setTimeout(() => setCurlCopied(false), 1500);
    } catch (e) {
      addToast("error", `Copy failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // schema ref — lets stable extensions always see the latest schema
  const schemaRef = useRef(graphqlSchema);
  schemaRef.current = graphqlSchema;

  // stable extensions (created once; refs handle live data)
  const editorExtensions = useMemo(
    () => [
      autocompletion({
        override: [
          (ctx: CompletionContext) => {
            const schema = schemaRef.current;
            if (!schema) return null;
            const word = ctx.matchBefore(/\w*/);
            if (!word || (word.from === word.to && !ctx.explicit)) return null;
            const roots = rootGraphQLTypes(schema);
            const options = roots.flatMap((r) =>
              graphQLAutocompleteFields(schema, r.type.name).map((f) => ({
                label: f.label,
                detail: f.detail,
                apply: f.snippet,
              })),
            );
            return { from: word.from, options };
          },
        ],
      }),
      makeGraphQLLinter(schemaRef),
      lintGutter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // P3.4 helper — resolve URL with current env and try to restore schema cache
  const tryRestoreSchema = () => {
    if (graphqlSchema) return;
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const vars = variablesFromScopes([
      { name: "environment", variables: env?.variables ?? [] },
      { name: "session", variables: sessionVariables },
    ]);
    const resolvedUrl = resolveTemplate(request.url.trim(), vars).value;
    if (!resolvedUrl) return;
    const cached = loadCachedSchema(resolvedUrl);
    if (cached) {
      set({
        graphqlSchema: cached.schema,
        graphqlSchemaStatus: "Schema restored from cache",
        graphqlSchemaEndpoint: resolvedUrl,
        graphqlSchemaLastFetched: cached.lastFetched,
      });
    }
  };

  // auto-restore on URL change (raw template) or environment switch (P3.1 + P3.4)
  useEffect(() => {
    tryRestoreSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.url, activeEnvironmentId]);

  // auto-scaffold variables from query variable definitions (P1.4)
  useEffect(() => {
    const varNames = extractQueryVarDefs(graphqlRequest.query ?? "");
    if (varNames.length === 0) return;
    const scaffolded = scaffoldVariables(
      graphqlRequest.variables ?? "{}",
      varNames,
    );
    if (scaffolded !== graphqlRequest.variables)
      setGraphqlRequest({ variables: scaffolded });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphqlRequest.query]);

  // operation picker auto-select (P4.4)
  const operations = useMemo(
    () => extractOperations(graphqlRequest.query ?? ""),
    [graphqlRequest.query],
  );

  const isSubscription = operations.some((op) => op.kind === "subscription");
  useEffect(() => {
    if (operations.length === 1 && operations[0].name) {
      if (graphqlRequest.operationName !== operations[0].name)
        setGraphqlRequest({ operationName: operations[0].name });
    } else if (operations.length === 0 || !operations.some((o) => o.name)) {
      if (graphqlRequest.operationName)
        setGraphqlRequest({ operationName: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operations]);

  const insertField = (snippet: string) => {
    const current = graphqlRequest.query ?? "";
    const suffix = current && !current.endsWith("\n") ? "\n" : "";
    setGraphqlRequest({ query: current + suffix + `  ${snippet}\n` });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--border)]">
        {/* Schema group */}
        <button
          onClick={() => setSchemaModalOpen(true)}
          className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
          title="Import Schema"
        >
          <FileUp size={13} />
        </button>
        <button
          onClick={() => setSchemaExplorerOpen((v) => !v)}
          disabled={!graphqlSchema}
          className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none ${schemaExplorerOpen ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
          title={graphqlSchema ? "Schema Explorer" : "Import a schema first"}
        >
          <Layers size={13} />
        </button>

        <div className="w-px h-4 bg-[var(--border)] mx-1" />

        {/* Write group */}
        <button
          onClick={handlePrettify}
          className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
          title="Prettify query"
        >
          <Wand2 size={13} />
        </button>

        <div className="w-px h-4 bg-[var(--border)] mx-1" />

        {/* Options group */}
        <div className="relative" ref={optionsRef}>
          <button
            onClick={() => setOptionsOpen((v) => !v)}
            className={`p-1.5 rounded transition-colors ${optionsOpen ? "bg-[var(--border)] text-[var(--text-1)]" : "hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
            title="Options"
          >
            <SlidersHorizontal size={13} />
          </button>
          {optionsOpen && (
            <div className="absolute left-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-2.5 px-3 flex flex-col gap-2.5 min-w-[180px]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={graphqlRequest.apq ?? false}
                  onChange={(e) => setGraphqlRequest({ apq: e.target.checked })}
                  disabled={graphqlRequest.batchMode}
                />
                <span className="text-xs text-[var(--text-1)]">APQ</span>
                <span className="text-2xs text-[var(--text-3)] ml-auto">persisted queries</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={graphqlRequest.batchMode ?? false}
                  onChange={(e) => setGraphqlRequest({ batchMode: e.target.checked })}
                  disabled={graphqlRequest.apq}
                />
                <span className="text-xs text-[var(--text-1)]">Batch</span>
                <span className="text-2xs text-[var(--text-3)] ml-auto">array body</span>
              </label>
            </div>
          )}
        </div>
        <button
          onClick={copyCurl}
          disabled={!request.url.trim()}
          className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title={curlCopied ? "Copied!" : "Copy as cURL"}
        >
          {curlCopied ? <Check size={13} className="text-[var(--ok)]" /> : <Copy size={13} />}
        </button>

        <div className="flex-1" />

        {/* Contextual */}
        {operations.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-[var(--text-3)]">Op:</span>
            <Select
              value={graphqlRequest.operationName ?? ""}
              onChange={(e) => setGraphqlRequest({ operationName: e.target.value })}
              size="2xs"
            >
              <option value="">— pick —</option>
              {operations.map((op, i) => (
                <option key={i} value={op.name ?? ""}>
                  {op.name ?? `(anonymous ${op.kind})`}
                </option>
              ))}
            </Select>
          </div>
        )}
        {isSubscription &&
          (subState === "subscribed" || subState === "connecting" ? (
            <button onClick={unsubscribe} className="btn btn-danger text-2xs py-0.5 px-2 gap-1">
              <StopCircle size={12} />
              {subState === "connecting" ? "Connecting…" : "Stop"}
            </button>
          ) : (
            <button
              onClick={() => subscribe({
                url: request.url,
                headers: graphqlRequest.headers ?? [],
                query: graphqlRequest.query ?? "",
                variables: graphqlRequest.variables,
                operationName: graphqlRequest.operationName,
              })}
              disabled={!request.url.trim()}
              className="btn btn-primary text-2xs py-0.5 px-2 gap-1"
            >
              <Zap size={12} />
              Subscribe
            </button>
          ))}
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
          <CodeEditor
            value={graphqlRequest.query ?? ""}
            onChange={(value) => setGraphqlRequest({ query: value })}
            lang="graphql"
            minHeight="200px"
            extensions={editorExtensions}
          />
        </div>
      </div>

      {graphqlSchema && schemaExplorerOpen && (
        <GraphQLSchemaModal
          schema={graphqlSchema}
          onClose={() => setSchemaExplorerOpen(false)}
          onInsertField={insertField}
        />
      )}

      {(subMessages.length > 0 ||
        subState === "subscribed" ||
        subState === "connecting") && (
        <GQLSubscriptionLog
          state={subState}
          messages={subMessages}
          onClear={clearMessages}
        />
      )}

      <GraphQLSchemaImportModal
        open={schemaModalOpen}
        onClose={() => setSchemaModalOpen(false)}
      />
    </div>
  );
}

// ── Subscription log ────────────────────────────────────────────────────────

function GQLSubscriptionLog({
  state,
  messages,
  onClear,
}: {
  state: import("../useGraphQLSubscription").GQLSubState;
  messages: GQLSubMessage[];
  onClear: () => void;
}) {
  const stateColors: Record<typeof state, string> = {
    idle: "bg-zinc-400",
    connecting: "bg-yellow-400 animate-pulse",
    subscribed: "bg-[var(--ok)] animate-pulse",
    complete: "bg-zinc-400",
    error: "bg-[var(--danger)]",
  };

  return (
    <div
      className="border-t border-[var(--border)] flex flex-col shrink-0"
      style={{ maxHeight: 200 }}
    >
      <div className="flex items-center gap-2 px-3 py-1 border-b border-[var(--border)] bg-[var(--surface-2)] shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${stateColors[state]}`} />
        <span className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider flex-1">
          Subscription
          {state === "subscribed" && (
            <span className="ml-1 font-normal normal-case">
              — {messages.filter((m) => m.kind === "data").length} messages
            </span>
          )}
        </span>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-2xs text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-2xs text-[var(--text-3)] text-center py-4">
            {state === "connecting" ? "Connecting…" : "Waiting for messages…"}
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 px-3 py-1.5 border-b border-[var(--border)] last:border-0 ${
              msg.kind === "data" ? "" : "bg-[var(--surface-2)]"
            }`}
          >
            <ArrowDown
              size={11}
              className={`mt-0.5 shrink-0 ${
                msg.kind === "error"
                  ? "text-[var(--danger)]"
                  : msg.kind === "data"
                    ? "text-[var(--ok)]"
                    : msg.kind === "complete"
                      ? "text-[var(--warn)]"
                      : "text-[var(--text-3)]"
              }`}
            />
            <pre className="text-2xs font-mono text-[var(--text-1)] break-all whitespace-pre-wrap flex-1 min-w-0">
              {msg.payload}
            </pre>
            <span className="text-2xs text-[var(--text-3)] shrink-0 mt-0.5">
              {new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Schema explorer modal ────────────────────────────────────────────────────

function GraphQLSchemaModal({
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
  const [fragments, setFragments] = useState<SavedFragment[]>(loadFragments);

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

  const refreshAbortRef = useRef<AbortController | null>(null);

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
      const diff = diffSchemas(schema, newSchema);
      const parts: string[] = [];
      if (diff.added.length)
        parts.push(`+${diff.added.length} type${diff.added.length > 1 ? "s" : ""}`);
      if (diff.removed.length)
        parts.push(`-${diff.removed.length} type${diff.removed.length > 1 ? "s" : ""}`);
      const msg = parts.length
        ? `Schema refreshed (${parts.join(", ")})`
        : "Schema refreshed — no changes";
      set({
        graphqlSchema: newSchema,
        graphqlSchemaStatus: "Schema refreshed",
        graphqlSchemaEndpoint: endpoint,
        graphqlSchemaLastFetched: lastFetched,
      });
      cacheSchema(endpoint, newSchema, lastFetched);
      addToast("success", msg);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      addToast("error", `Refresh failed: ${e instanceof Error ? e.message : String(e)}`);
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
        style={{ width: 880, maxWidth: "calc(100vw - 48px)", height: 580, maxHeight: "calc(100vh - 64px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--surface-2)]">
          <Layers size={14} className="text-[var(--accent)] shrink-0" />
          <span className="text-sm font-semibold">Schema Explorer</span>

          <div className="flex items-center gap-0.5 ml-2">
            {(["types", "sdl", "frags"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`tab-btn text-xs py-0.5 px-2 ${view === v ? "active" : ""}`}
              >
                {v === "types" ? "Types" : v === "sdl" ? "SDL" : "Fragments"}
              </button>
            ))}
          </div>

          {view === "types" && (
            <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] focus-within:border-[var(--accent)] rounded-md px-2 py-1 w-52 ml-2 transition-colors">
              <Search size={11} className="text-[var(--text-3)] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search types and fields…"
                className="bg-transparent text-xs outline-none border-0 focus:ring-0 focus:border-0 flex-1 min-w-0 text-[var(--text-1)] placeholder-[var(--text-3)]"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-[var(--text-3)] hover:text-[var(--text-1)]">
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {graphqlSchemaLastFetched > 0 && (
              <span className="text-xs text-[var(--text-3)]">{fmtAge(graphqlSchemaLastFetched)}</span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1 rounded hover:bg-[var(--border)] text-[var(--text-3)] disabled:opacity-50 transition-colors"
              title="Refresh schema"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[var(--border)] text-[var(--text-3)] transition-colors"
              title="Close"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {view === "types" && (
            <>
              {/* Left: type list */}
              <div className="w-60 border-r border-[var(--border)] overflow-y-auto shrink-0 bg-[var(--surface-2)]">
                {filteredTypes.length === 0 && (
                  <p className="text-xs text-[var(--text-3)] px-4 py-6 text-center">No types match</p>
                )}
                {filteredTypes.map((type) => {
                  const badge = kindBadge(type.kind);
                  const isSelected = selectedType === type.name;
                  return (
                    <button
                      key={type.name}
                      onClick={() => setSelectedType(isSelected ? null : type.name)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${isSelected ? "bg-[var(--accent)]/10 border-r-2 border-[var(--accent)]" : "hover:bg-[var(--border)]"}`}
                      title={type.description ?? undefined}
                    >
                      <span className={`text-2xs px-1.5 py-0.5 rounded font-mono shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className={`text-xs font-mono truncate flex-1 ${isSelected ? "text-[var(--accent)]" : "text-[var(--text-1)]"}`}>
                        {type.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right: type detail */}
              <div className="flex-1 overflow-y-auto">
                {activeType ? (
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border)]">
                      <span className={`text-xs px-2 py-0.5 rounded-md font-mono font-medium ${kindBadge(activeType.kind).cls}`}>
                        {kindBadge(activeType.kind).label}
                      </span>
                      <span className="text-base font-mono font-semibold text-[var(--accent)]">
                        {activeType.name}
                      </span>
                      {activeType.description && (
                        <span className="text-xs text-[var(--text-3)]">{activeType.description}</span>
                      )}
                    </div>
                    <TypeDetail
                      type={activeType}
                      schema={schema}
                      onInsertField={onInsertField}
                      onNavigate={(name) => setSelectedType(name)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-3)]">
                    <Layers size={28} className="opacity-20" />
                    <p className="text-sm">Select a type to explore its fields</p>
                  </div>
                )}
              </div>
            </>
          )}

          {view === "sdl" && (
            <div className="flex-1 overflow-auto">
              <pre className="text-xs font-mono text-[var(--text-2)] p-5 whitespace-pre-wrap break-words leading-relaxed">
                {sdlText}
              </pre>
            </div>
          )}

          {view === "frags" && (
            <div className="flex-1 overflow-hidden">
              <FragmentsPanel
                fragments={fragments}
                onInsert={(frag) => onInsertField(`\n${frag.body}`)}
                onDelete={(id) => {
                  const updated = fragments.filter((f) => f.id !== id);
                  setFragments(updated);
                  saveFragments(updated);
                }}
                onSaveFromQuery={() => {
                  const defs = extractFragmentDefs(graphqlRequest.query ?? "");
                  if (defs.length === 0) return;
                  const existing = new Set(fragments.map((f) => f.name));
                  const newFrags = defs.filter((d) => !existing.has(d.name));
                  if (newFrags.length === 0) return;
                  const updated = [...fragments, ...newFrags];
                  setFragments(updated);
                  saveFragments(updated);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Fragments panel ─────────────────────────────────────────────────────────

function FragmentsPanel({
  fragments,
  onInsert,
  onDelete,
  onSaveFromQuery,
}: {
  fragments: SavedFragment[];
  onInsert: (frag: SavedFragment) => void;
  onDelete: (id: string) => void;
  onSaveFromQuery: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-2 py-1 border-b border-[var(--border)] shrink-0 flex items-center gap-1">
        <button
          onClick={onSaveFromQuery}
          className="flex items-center gap-1 text-2xs text-[var(--accent)] hover:underline"
          title="Save fragment definitions from current query"
        >
          <BookmarkPlus size={11} />
          Save from query
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {fragments.length === 0 ? (
          <p className="text-2xs text-[var(--text-3)] px-3 py-4 text-center">
            No saved fragments. Write a fragment definition in the query and
            click "Save from query".
          </p>
        ) : (
          fragments.map((frag) => (
            <div
              key={frag.id}
              className="border-b border-[var(--border)] px-2 py-1.5"
            >
              <div className="flex items-start gap-1">
                <div className="flex-1 min-w-0">
                  <p className="text-2xs font-mono text-[var(--accent)] truncate">
                    {frag.name}
                  </p>
                  <p className="text-2xs text-[var(--text-3)] truncate">
                    on {frag.onType}
                  </p>
                </div>
                <button
                  onClick={() => onInsert(frag)}
                  className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--accent)] shrink-0"
                  title="Insert into query"
                >
                  <Copy size={10} />
                </button>
                <button
                  onClick={() => onDelete(frag.id)}
                  className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
                  title="Delete fragment"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Type detail ─────────────────────────────────────────────────────────────

function TypeDetail({
  type,
  schema,
  onInsertField,
  onNavigate,
  compact = false,
}: {
  type: GraphQLIntrospectionType;
  schema: GraphQLIntrospectionSchema;
  onInsertField: (snippet: string) => void;
  onNavigate: (typeName: string) => void;
  compact?: boolean;
}) {
  const indent = compact ? "pl-7" : "pl-2";

  if (type.kind === "ENUM") {
    return (
      <>
        {type.enumValues?.map((val) => (
          <button
            key={val.name}
            onClick={() => onInsertField(val.name)}
            className={`w-full flex items-center gap-1 ${indent} pr-2 py-0.5 hover:bg-[var(--border)] text-left`}
            title={val.description ?? undefined}
          >
            {val.isDeprecated && (
              <AlertTriangle size={9} className="text-[var(--warn)] shrink-0" />
            )}
            <span
              className={`text-2xs font-mono flex-1 truncate ${val.isDeprecated ? "line-through text-[var(--text-3)]" : "text-[var(--text-1)]"}`}
            >
              {val.name}
            </span>
          </button>
        ))}
      </>
    );
  }

  if (type.kind === "UNION") {
    return (
      <>
        {type.possibleTypes?.map((pt) => (
          <button
            key={pt.name}
            onClick={() => pt.name && onNavigate(pt.name)}
            className={`w-full flex items-center gap-1 ${indent} pr-2 py-0.5 hover:bg-[var(--border)] text-left`}
          >
            <span className="text-2xs font-mono text-[var(--accent)] truncate">
              {pt.name}
            </span>
          </button>
        ))}
      </>
    );
  }

  if (type.kind === "INPUT_OBJECT") {
    return (
      <>
        {type.inputFields?.map((field) => {
          const namedType = namedGraphQLType(field.type);
          const isNavigable = namedType && typeByName(schema, namedType);
          return (
            <div
              key={field.name}
              className={`w-full flex items-center gap-1 ${indent} pr-2 py-0.5`}
              title={field.description ?? undefined}
            >
              <span className="text-2xs font-mono text-[var(--text-1)] truncate flex-1">
                {field.name}
              </span>
              {isNavigable ? (
                <button
                  onClick={() => onNavigate(namedType!)}
                  className="text-2xs text-[var(--text-3)] hover:text-[var(--accent)] truncate ml-1 font-mono"
                >
                  {formatGraphQLTypeRef(field.type)}
                </button>
              ) : (
                <span className="text-2xs text-[var(--text-3)] truncate ml-1 font-mono">
                  {formatGraphQLTypeRef(field.type)}
                </span>
              )}
            </div>
          );
        })}
      </>
    );
  }

  // OBJECT / INTERFACE
  return (
    <>
      {type.fields?.map((field) => {
        const namedType = namedGraphQLType(field.type);
        const isNavigable = namedType && typeByName(schema, namedType);
        return (
          <button
            key={field.name}
            onClick={() => onInsertField(graphQLFieldSnippet(field))}
            className={`w-full flex items-center gap-1 ${indent} pr-2 py-0.5 hover:bg-[var(--border)] text-left`}
            title={field.description ?? undefined}
          >
            {field.isDeprecated && (
              <AlertTriangle size={9} className="text-[var(--warn)] shrink-0" />
            )}
            <span
              className={`text-2xs font-mono flex-1 truncate ${field.isDeprecated ? "line-through text-[var(--text-3)]" : "text-[var(--text-1)]"}`}
            >
              {field.name}
            </span>
            {isNavigable ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(namedType!);
                }}
                className="text-2xs text-[var(--text-3)] hover:text-[var(--accent)] truncate ml-1 font-mono"
                title={`Go to ${namedType}`}
              >
                {formatGraphQLTypeRef(field.type)}
              </button>
            ) : (
              <span className="text-2xs text-[var(--text-3)] truncate ml-1 font-mono">
                {formatGraphQLTypeRef(field.type)}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

// ── Status helpers ──────────────────────────────────────────────────────────

function graphQLSchemaStatusClass(status: string) {
  if (status.startsWith("Failed")) return "text-[var(--danger)]";
  if (status.startsWith("Missing")) return "text-[var(--warn)]";
  return "text-[var(--text-3)]";
}

function graphQLSchemaFailureStatus(error: unknown) {
  return `Failed: ${error instanceof Error ? error.message : String(error)}`;
}

// ── Import modal ─────────────────────────────────────────────────────────────

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
    graphqlSchemaEndpoint,
    environments,
    activeEnvironmentId,
    sessionVariables,
  } = useStore();
  const [source, setSource] = useState<GraphQLSchemaImportSource>("url");
  const [schemaUrl, setSchemaUrl] = useState("");
  const [sdlText, setSdlText] = useState("");
  const [working, setWorking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sdlFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setSource("url");
    setWorking(false);
    // pre-fill with last known endpoint (P3.4)
    if (graphqlSchemaEndpoint && !schemaUrl)
      setSchemaUrl(graphqlSchemaEndpoint);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

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
      if (h.enabled !== false && h.key)
        headers[resolve(h.key)] = resolve(h.value);
    });
    return {
      url: resolve(schemaUrl.trim()),
      headers,
      unresolved: [...unresolved],
    };
  };

  const commitSchema = (
    schema: GraphQLIntrospectionSchema,
    endpoint: string,
  ) => {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
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
            {(["url", "file", "sdl"] as GraphQLSchemaImportSource[]).map(
              (option) => (
                <button
                  key={option}
                  onClick={() => setSource(option)}
                  className={`tab-btn text-2xs ${source === option ? "active" : ""}`}
                >
                  {option === "url"
                    ? "URL"
                    : option === "file"
                      ? "JSON File"
                      : "SDL"}
                </button>
              ),
            )}
          </div>

          {source === "url" && (
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
          )}

          {source === "file" && (
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
              <span className="text-2xs text-[var(--text-3)]">
                Introspection result JSON
              </span>
            </div>
          )}

          {source === "sdl" && (
            <div className="flex flex-col gap-2">
              <label className="text-2xs text-[var(--text-3)]">
                Paste SDL or load a .graphql file
              </label>
              <textarea
                value={sdlText}
                onChange={(e) => setSdlText(e.target.value)}
                placeholder="type Query { ... }"
                rows={6}
                className="input text-2xs font-mono resize-y"
              />
              <div className="flex items-center gap-2">
                <input
                  ref={sdlFileInputRef}
                  type="file"
                  accept=".graphql,.gql,text/plain"
                  className="hidden"
                  onChange={(e) => importSDLFile(e.target.files?.[0])}
                />
                <button
                  onClick={() => sdlFileInputRef.current?.click()}
                  disabled={working}
                  className="btn text-xs gap-1.5"
                >
                  <FileUp size={13} />
                  Load file
                </button>
              </div>
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
          {source === "sdl" && (
            <button
              onClick={importSDLText}
              disabled={working || !sdlText.trim()}
              className="btn btn-primary text-xs gap-1.5"
            >
              {working ? "Importing..." : "Import SDL"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
