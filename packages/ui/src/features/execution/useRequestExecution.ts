import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCollections, useCookies, useFolders } from "../../hooks/useDb";
import { useStore } from "../../store";
import { PROXY_RECORDS_KEY } from "../proxy/useProxyRecords";
import { applyOAuth2Token } from "./oauth2";
import { injectCookies } from "./cookies";
import { resolveWithPreRequestScript } from "./utils/preRequest";
import {
  buildActiveRequest,
  runBrowserRequest,
  runBufferedRequest,
  runStreamingRequest,
} from "./utils/runExecution";
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
  const browserMode = useStore((state) => state.browserMode);
  const enableCookies = useStore((state) => state.enableCookies);
  const requests = useStore((state) => state.requests);
  const cookies = useCookies();
  const cookiesRef = useRef(cookies);
  cookiesRef.current = cookies;
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
    const currentCookies = cookiesRef.current;
    if (enableCookies && currentCookies.length > 0) {
      resolved = injectCookies(resolved, currentCookies);
    }
    set({ resolvedRequest: resolved });

    resolved = await applyOAuth2Token(
      resolved,
      (message) => addToast("warn", message),
      (newAuth) => setRequest({ auth: newAuth }),
    );

    set({ responseBrowserMode: browserMode && !streamMode });

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

    const browserUnsupported =
      browserMode &&
      (resolved.bodyMode === "form-data" ||
        resolved.bodyMode === "file" ||
        resolved.bodyMode === "graphql-multipart");
    if (browserUnsupported) {
      addToast("warn", `Client mode does not support ${resolved.bodyMode} — using server mode`);
    }

    const httpVersion = resolved.options?.httpVersion ?? "auto";
    if (browserMode && !browserUnsupported && httpVersion !== "auto") {
      addToast(
        "warn",
        `The HTTP version setting (${httpVersion}) only works in server mode — your browser will pick the version automatically`,
      );
    }

    if (browserMode && !browserUnsupported) {
      await runBrowserRequest({
        resolved,
        activeRequest,
        protocol,
        prepared,
        vars,
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
    browserMode,
    collections,
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
