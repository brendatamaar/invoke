import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCollections, useCookies, useFolders } from "../../hooks/useDb";
import { useStore } from "../../store";
import { PROXY_RECORDS_KEY } from "../proxy";
import { applyOAuth2Token } from "./oauth2";
import { injectCookies } from "./cookies";
import { resolveWithPreRequestScript } from "./utils/preRequest";
import { buildActiveRequest, runBufferedRequest, runStreamingRequest } from "./utils/runExecution";
import { buildExecutionScopeContext } from "./utils/scopes";

export function useRequestExecution() {
  const queryClient = useQueryClient();
  const request = useStore((state) => state.request);
  const graphqlRequest = useStore((state) => state.graphqlRequest);
  const graphqlFileUploads = useStore((state) => state.graphqlFileUploads);
  const environments = useStore((state) => state.environments);
  const activeEnvironmentId = useStore((state) => state.activeEnvironmentId);
  const sessionVariables = useStore((state) => state.sessionVariables);
  const assertionRules = useStore((state) => state.assertionRules);
  const extractRules = useStore((state) => state.extractRules);
  const streamMode = useStore((state) => state.streamMode);
  const enableCookies = useStore((state) => state.enableCookies);
  const requests = useStore((state) => state.requests);
  const cookies = useCookies();
  const collections = useCollections();
  const folders = useFolders();
  const loading = useStore((state) => state.loading);
  const streaming = useStore((state) => state.streaming);
  const set = useStore((state) => state.set);
  const setRequest = useStore((state) => state.setRequest);
  const addToast = useStore((state) => state.addToast);

  const handleSend = useCallback(async () => {
    if (loading || streaming || !request.url.trim()) return;
    set({ graphqlDeferredParts: null });

    const protocol = request.protocol ?? "rest";
    const activeRequest = buildActiveRequest({
      protocol,
      request,
      graphqlRequest,
      graphqlFileUploads,
      set,
      addToast,
    });
    if (!activeRequest) return;

    const { buildScopes, vars } = buildExecutionScopeContext({
      request,
      activeRequest,
      requests,
      collections,
      folders,
      environments,
      activeEnvironmentId,
      sessionVariables,
    });
    const prepared = await resolveWithPreRequestScript({
      activeRequest,
      vars,
      buildScopes,
    });

    if (prepared.unresolved.length > 0) {
      addToast(
        "warn",
        `Unresolved variables: ${[...new Set(prepared.unresolved)].slice(0, 5).join(", ")}`,
      );
    }

    let resolved = prepared.resolved;
    if (enableCookies && cookies.length > 0) {
      resolved = injectCookies(resolved, cookies);
    }
    set({ resolvedRequest: resolved });

    resolved = await applyOAuth2Token(
      resolved,
      (message) => addToast("warn", message),
      (newAuth) => setRequest({ auth: newAuth }),
    );

    if (streamMode) {
      await runStreamingRequest({
        resolved,
        protocol,
        prepared,
        assertionRules,
        extractRules,
        sessionVariables,
        enableCookies,
        set,
        addToast,
      });
      return;
    }

    const isProxyRequest = await runBufferedRequest({
      resolved,
      activeRequest,
      protocol,
      prepared,
      vars,
      graphqlRequest,
      assertionRules,
      extractRules,
      sessionVariables,
      enableCookies,
      set,
      addToast,
    });
    if (isProxyRequest) {
      queryClient.invalidateQueries({ queryKey: PROXY_RECORDS_KEY });
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
    graphqlRequest,
    loading,
    queryClient,
    request,
    requests,
    sessionVariables,
    set,
    setRequest,
    streamMode,
    streaming,
  ]);

  return { handleSend };
}
