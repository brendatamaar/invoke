import { useCallback } from "react";
import {
  extractVariables,
  graphQLToRequestConfig,
  resolveRequest,
  runAssertions,
  runPostResponseScript,
  runPreRequestScript,
  variablesFromScopes,
  type ExecuteResponse,
  type RequestConfig,
  type RequestDraft,
  type VariableScope,
} from "@invoke/core";
import {
  executeStream,
  executeWithAPQ,
  executeWithRetry,
} from "../execute/api";
import { processMultipartResponse } from "../execute/multipart";
import { coreStore, useStore } from "../../store";
import { injectCookies, persistResponseCookies } from "./cookies";
import { applyOAuth2Token } from "./oauth2";
import { extractRequiredVarNames } from "../request/components/GraphQLPanels";

export function useRequestExecution() {
  const request = useStore((state) => state.request);
  const graphqlRequest = useStore((state) => state.graphqlRequest);
  const graphqlFileUploads = useStore((state) => state.graphqlFileUploads);
  const environments = useStore((state) => state.environments);
  const activeEnvironmentId = useStore((state) => state.activeEnvironmentId);
  const sessionVariables = useStore((state) => state.sessionVariables);
  const assertionRules = useStore((state) => state.assertionRules);
  const extractRules = useStore((state) => state.extractRules);
  const streamMode = useStore((state) => state.streamMode);
  const cookies = useStore((state) => state.cookies);
  const enableCookies = useStore((state) => state.enableCookies);
  const collections = useStore((state) => state.collections);
  const folders = useStore((state) => state.folders);
  const requests = useStore((state) => state.requests);
  const loading = useStore((state) => state.loading);
  const streaming = useStore((state) => state.streaming);
  const set = useStore((state) => state.set);
  const setRequest = useStore((state) => state.setRequest);
  const addToast = useStore((state) => state.addToast);

  const handleSend = useCallback(async () => {
    if (loading || streaming || !request.url.trim()) return;
    set({ graphqlDeferredParts: null });

    const protocol = request.protocol ?? "rest";

    // For GraphQL, validate variables and convert to REST request shape
    let activeRequest: RequestDraft;
    if (protocol === "graphql") {
      const varsStr = graphqlRequest.variables?.trim() ?? "{}";
      let parsedVars: Record<string, unknown> = {};
      if (varsStr && varsStr !== "{}") {
        try {
          parsedVars = JSON.parse(varsStr);
        } catch {
          addToast("warn", "Variables panel contains invalid JSON");
          set({ requestTab: "graphqlVariables" });
          return;
        }
      }
      // P4.2 — warn on missing required (non-null, no default) variables
      const requiredVars = extractRequiredVarNames(graphqlRequest.query ?? "");
      const missingVars = requiredVars.filter(
        (name) => !(name in parsedVars) || parsedVars[name] === null,
      );
      if (missingVars.length > 0) {
        addToast(
          "warn",
          `Missing required variable${missingVars.length > 1 ? "s" : ""}: ${missingVars.join(", ")}`,
        );
        set({ requestTab: "graphqlVariables" });
        return;
      }
      const converted = graphQLToRequestConfig({
        ...graphqlRequest,
        url: request.url,
      });

      // P5.1 file uploads — switch to graphql-multipart bodyMode
      if (graphqlFileUploads.length > 0) {
        try {
          const operations = JSON.parse(converted.body) as Record<
            string,
            unknown
          >;
          // ensure variable paths are null in operations.variables
          const variables = (operations.variables ?? {}) as Record<
            string,
            unknown
          >;
          const map: Record<string, string[]> = {};
          graphqlFileUploads.forEach((f, idx) => {
            const key = String(idx);
            map[key] = [`variables.${f.varPath}`];
            variables[f.varPath] = null;
          });
          operations.variables = variables;
          converted.body = JSON.stringify({
            operations,
            map,
            files: graphqlFileUploads.map((f, idx) => ({
              field: String(idx),
              filename: f.filename,
              dataUrl: f.dataUrl,
            })),
          });
          converted.bodyMode = "graphql-multipart";
        } catch {
          /* keep original body */
        }
      }

      // P5.2 batch mode — wrap body in array
      if (graphqlRequest.batchMode && graphqlFileUploads.length === 0) {
        try {
          const bodyArr = [JSON.parse(converted.body)];
          converted.body = JSON.stringify(bodyArr);
        } catch {
          /* keep original body */
        }
      }

      activeRequest = { ...converted, protocol: "graphql" } as RequestDraft;
    } else {
      activeRequest = request;
    }

    const env = environments.find((e) => e.id === activeEnvironmentId);
    // Look up collectionId/folderId from the saved requests store first (authoritative),
    // then fall back to whatever is on the active request draft.
    const savedReq = request.id ? requests.find((r) => r.id === request.id) : undefined;
    const collectionId = savedReq?.collectionId ?? request.collectionId;
    const folderId = savedReq?.folderId ?? request.folderId;
    const collection = collections.find((c) => c.id === collectionId);
    const folder = folders.find((f) => f.id === folderId);

    // Priority (lowest → highest): environment → collection → folder → request → session
    const buildScopes = (req: RequestConfig): VariableScope[] => [
      { name: "environment", variables: env?.variables ?? [] },
      { name: "collection", variables: collection?.variables ?? [] },
      { name: "folder", variables: folder?.variables ?? [] },
      { name: "request", variables: req.variables ?? [] },
      { name: "session", variables: sessionVariables },
    ];

    const varScopes = buildScopes(activeRequest as RequestConfig);
    const vars = variablesFromScopes(varScopes);

    let resolved: RequestConfig;
    let unresolved: string[] = [];
    try {
      const scriptCtx = await runPreRequestScript(
        activeRequest as RequestConfig,
        vars,
        activeRequest.scripts?.preRequest ?? "",
      );
      const effectiveReq = (scriptCtx.request ?? activeRequest) as RequestConfig;
      const result = resolveRequest(effectiveReq, buildScopes(effectiveReq));
      resolved = result.request;
      unresolved = result.unresolved;
    } catch {
      const result = resolveRequest(
        activeRequest as RequestConfig,
        buildScopes(activeRequest as RequestConfig),
      );
      resolved = result.request;
      unresolved = result.unresolved;
    }

    if (unresolved.length > 0) {
      addToast(
        "warn",
        `Unresolved variables: ${[...new Set(unresolved)].slice(0, 5).join(", ")}`,
      );
    }

    if (enableCookies && cookies.length > 0) {
      resolved = injectCookies(resolved, cookies);
    }

    set({ resolvedRequest: resolved });

    resolved = await applyOAuth2Token(
      resolved,
      (message) => addToast("warn", message),
      (newAuth) => setRequest({ auth: newAuth }),
    );

    const persistCookies = async (
      response: { headers: { key: string; value: string }[] },
      url: string,
    ) => {
      if (!enableCookies) return;
      const updated = await persistResponseCookies(response, url);
      if (updated) set({ cookies: updated });
    };

    const finishStreamExecution = async (rawResponse: ExecuteResponse) => {
      const { response, parts } = processMultipartResponse(rawResponse);
      await persistCookies(response, resolved.url);
      const results = runAssertions(response, assertionRules);
      const extracted = extractVariables(response, extractRules);
      await coreStore.addHistory({
        request: resolved,
        response,
        protocol,
      });
      const hist = await coreStore.listHistory(200);
      set({
        response,
        assertionResults: results,
        sessionVariables: { ...sessionVariables, ...extracted },
        history: hist,
        streaming: false,
        retryAttempts: undefined,
        graphqlDeferredParts: parts,
      });
    };

    if (streamMode) {
      const controller = new AbortController();
      set({
        streaming: true,
        loading: false,
        response: undefined,
        streamBytes: 0,
        streamController: controller,
        retryAttempts: undefined,
      });
      try {
        await executeStream(resolved, {
          onChunk: (chunk) =>
            set((state: { streamBytes: number }) => ({
              streamBytes: state.streamBytes + chunk.length,
            })),
          onFinal: async (response) => {
            await finishStreamExecution(response);
          },
          signal: controller.signal,
        });
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") addToast("error", String(e));
        set({ streaming: false });
      }
      return;
    }

    const controller = new AbortController();
    set({
      loading: true,
      loadController: controller,
      response: undefined,
      retryAttempts: undefined,
    });
    try {
      const rawResponse = await (protocol === "graphql" &&
      graphqlRequest.apq &&
      !graphqlRequest.batchMode
        ? executeWithAPQ(
            resolved,
            controller.signal,
            graphqlRequest.query ?? "",
          )
        : executeWithRetry(resolved, controller.signal));
      const { response, parts } = processMultipartResponse(rawResponse);
      await persistCookies(response, resolved.url);

      try {
        await runPostResponseScript(
          resolved,
          response,
          vars,
          activeRequest.scripts?.postResponse ?? "",
        );
      } catch {
        /* ignore script errors */
      }

      const results = runAssertions(response, assertionRules);
      const extracted = extractVariables(response, extractRules);
      await coreStore.addHistory({
        request: resolved,
        response,
        protocol,
      });
      const hist = await coreStore.listHistory(200);
      set({
        response,
        assertionResults: results,
        sessionVariables: { ...sessionVariables, ...extracted },
        loading: false,
        loadController: undefined,
        retryAttempts: rawResponse.retryAttempts,
        history: hist,
        graphqlDeferredParts: parts,
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") addToast("error", String(e));
      set({ loading: false, loadController: undefined });
    }
  }, [
    activeEnvironmentId,
    addToast,
    assertionRules,
    collections,
    cookies,
    enableCookies,
    environments,
    extractRules,
    folders,
    graphqlFileUploads,
    requests,
    graphqlRequest,
    loading,
    request,
    sessionVariables,
    set,
    setRequest,
    streamMode,
    streaming,
  ]);

  return { handleSend };
}
