import { useEffect, useMemo, useRef, useState } from "react";
import { autocompletion } from "@codemirror/autocomplete";
import type { CompletionContext } from "@codemirror/autocomplete";
import { lintGutter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import {
  generateCodeSnippet,
  graphQLAutocompleteFields,
  graphQLToRequestConfig,
  resolveTemplate,
  rootGraphQLTypes,
  variablesFromScopes,
  type GraphQLIntrospectionSchema,
} from "@invoke/core";
import { useStore } from "../../../store";
import { applyProtocolDefaults } from "../../../lib/protocolDefaults";
import { useGraphQLSubscription } from "./useGraphQLSubscription";
import { loadCachedSchema } from "../utils/cache";
import {
  extractOperations,
  extractQueryVarDefs,
  prettifyQuery,
  scaffoldVariables,
} from "../utils/query";
import { makeGraphQLLinter } from "../utils/linter";

export function useGraphQLQueryPanel() {
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
  const [curlCopied, setCurlCopied] = useState(false);
  const curlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscription = useGraphQLSubscription();

  useEffect(() => {
    const timeoutRef = curlTimeoutRef;
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const editorRef = useRef<EditorView | null>(null);
  const schemaRef = useRef<GraphQLIntrospectionSchema | undefined>(graphqlSchema);
  schemaRef.current = graphqlSchema;
  const jsonUnescapePasteExtension = useMemo(
    () =>
      EditorView.domEventHandlers({
        paste(event, view) {
          const text = event.clipboardData?.getData("text/plain");
          if (!text || !/\\[ntr"\\]/.test(text)) return false;
          try {
            const decoded = text.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
            if (decoded === text) return false;
            event.preventDefault();
            const { from, to } = view.state.selection.main;
            view.dispatch({ changes: { from, to, insert: decoded } });
            return true;
          } catch {
            return false;
          }
        },
      }),
    [],
  );

  const editorExtensions = useMemo(
    () => [
      jsonUnescapePasteExtension,
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
    [],
  );

  const handlePrettify = () => {
    const { result, error } = prettifyQuery(graphqlRequest.query ?? "");
    if (error) {
      addToast("error", `Cannot prettify: ${error}`);
      return;
    }
    setGraphqlRequest({ query: result });
  };

  const copyCurl = async () => {
    try {
      const config = graphQLToRequestConfig({
        ...graphqlRequest,
        url: request.url,
      });
      const snippet = await generateCodeSnippet(applyProtocolDefaults(config, "graphql"), "curl");
      await navigator.clipboard.writeText(snippet.code);
      setCurlCopied(true);
      if (curlTimeoutRef.current) clearTimeout(curlTimeoutRef.current);
      curlTimeoutRef.current = setTimeout(() => setCurlCopied(false), 1500);
    } catch (e) {
      addToast("error", `Copy failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  useEffect(() => {
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
  }, [activeEnvironmentId, environments, graphqlSchema, request.url, sessionVariables, set]);

  useEffect(() => {
    const varNames = extractQueryVarDefs(graphqlRequest.query ?? "");
    if (varNames.length === 0) return;
    const scaffolded = scaffoldVariables(graphqlRequest.variables ?? "{}", varNames);
    if (scaffolded !== graphqlRequest.variables) {
      setGraphqlRequest({ variables: scaffolded });
    }
  }, [graphqlRequest.query, graphqlRequest.variables, setGraphqlRequest]);

  const operations = useMemo(
    () => extractOperations(graphqlRequest.query ?? ""),
    [graphqlRequest.query],
  );
  const isSubscription = operations.some((op) => op.kind === "subscription");

  useEffect(() => {
    if (operations.length === 1 && operations[0].name) {
      if (graphqlRequest.operationName !== operations[0].name) {
        setGraphqlRequest({ operationName: operations[0].name });
      }
    } else if (operations.length === 0 || !operations.some((o) => o.name)) {
      if (graphqlRequest.operationName) setGraphqlRequest({ operationName: "" });
    }
  }, [operations, graphqlRequest.operationName, setGraphqlRequest]);

  const insertField = (snippet: string) => {
    const view = editorRef.current;
    if (view) {
      const { from, to } = view.state.selection.main;
      view.dispatch({ changes: { from, to, insert: `  ${snippet}\n` } });
      view.focus();
      return;
    }
    const current = graphqlRequest.query ?? "";
    const suffix = current && !current.endsWith("\n") ? "\n" : "";
    setGraphqlRequest({ query: current + suffix + `  ${snippet}\n` });
  };

  return {
    graphqlRequest,
    setGraphqlRequest,
    graphqlSchema,
    request,
    schemaModalOpen,
    setSchemaModalOpen,
    schemaExplorerOpen,
    setSchemaExplorerOpen,
    curlCopied,
    editorExtensions,
    editorRef,
    operations,
    isSubscription,
    subscription,
    handlePrettify,
    copyCurl,
    insertField,
  };
}
