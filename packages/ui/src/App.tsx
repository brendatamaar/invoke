import { useCallback, useEffect, useRef, useState } from "react";
import {
  extractVariables,
  generateCodeSnippet,
  parseCookieHeaders,
  matchCookies,
  buildCookieHeader,
  resolveRequest,
  runPostResponseScript,
  runPreRequestScript,
  runAssertions,
  variablesFromScopes,
  type RequestConfig,
  type VariableScope,
} from "@invoke/core";
import { useStore, coreStore } from "./store";
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { RequestBuilder } from "./components/request/RequestBuilder";
import { ResponseViewer } from "./components/response/ResponseViewer";
import { CommandPalette } from "./components/palette/CommandPalette";
import { Toasts } from "./components/shared/Toast";
import { DiffModal } from "./components/modals/DiffModal";
import { VariableEditorModal } from "./components/modals/VariableEditorModal";
import { HelpModal } from "./components/modals/HelpModal";
import { ClearHistoryModal } from "./components/modals/ClearHistoryModal";
import { SettingsPanel } from "./components/layout/SettingsPanel";
import { CollectionRunnerModal } from "./components/modals/CollectionRunnerModal";
import { BatchRunnerModal } from "./components/modals/BatchRunnerModal";
import { CookieManagerModal } from "./components/modals/CookieManagerModal";
import { execute, executeStream, executeWithRetry, oauth2ClientCredentials } from "./lib/api";

// Resize hook
function useResize(initial: number) {
  const [size, setSize] = useState(initial);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(initial);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startPos.current = e.clientY;
      startSize.current = size;
      e.preventDefault();
    },
    [size],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientY - startPos.current;
      setSize(
        Math.max(
          120,
          Math.min(startSize.current + delta, window.innerHeight - 200),
        ),
      );
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return { size, onMouseDown };
}

export default function App() {
  const {
    request,
    environments,
    activeEnvironmentId,
    sessionVariables,
    assertionRules,
    extractRules,
    streamMode,
    codeTarget,
    response,
    cookies,
    enableCookies,
    set,
    addToast,
    loading,
    streaming,
  } = useStore();

  const { size: requestHeight, onMouseDown: onResizeMouseDown } =
    useResize(320);

  // Bootstrap
  useEffect(() => {
    const load = async () => {
      try {
        const [cols, envs, hist, fls, activeEnvId, retention, examples, diffRules, cookieList] = await Promise.all([
          coreStore.listCollections(),
          coreStore.listEnvironments(),
          coreStore.listHistory(200),
          coreStore.listFlows(),
          coreStore.getActiveEnvironmentId(),
          coreStore.getRetentionSettings(),
          coreStore.listResponseExamples(),
          coreStore.listDiffIgnoreRules(),
          coreStore.listCookies(),
        ]);
        const reqs = await coreStore.listRequests();
        const folds = await coreStore.listFolders();
        set({
          collections: cols,
          environments: envs,
          history: hist,
          flows: fls,
          requests: reqs,
          folders: folds,
          activeEnvironmentId: activeEnvId,
          retentionSettings: retention,
          responseExamples: examples,
          diffIgnoreRules: diffRules,
          cookies: cookieList,
        });
      } catch (e) {
        addToast("error", `Failed to load data: ${e}`);
      }
    };
    load();
  }, []); // eslint-disable-line

  // Persist active environment
  useEffect(() => {
    coreStore.setActiveEnvironmentId(activeEnvironmentId).catch(() => {});
  }, [activeEnvironmentId]);

  // Code generation
  useEffect(() => {
    if (!response) return;
    let cancelled = false;
    set({ codeLoading: true });
    (async () => {
      try {
        const env = environments.find((e) => e.id === activeEnvironmentId);
        const { request: resolved } = resolveRequest(
          request as RequestConfig,
          env,
          sessionVariables,
        );
        const snippet = await generateCodeSnippet(resolved, codeTarget);
        if (!cancelled) set({ codeSnippet: snippet.code, codeLoading: false });
      } catch {
        if (!cancelled) set({ codeSnippet: "", codeLoading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [response, codeTarget]); // eslint-disable-line

  // Send handler
  const handleSend = useCallback(async () => {
    if (loading || streaming || !request.url.trim()) return;

    const env = environments.find((e) => e.id === activeEnvironmentId);
    const varScopes: VariableScope[] = [
      { name: "environment", variables: env?.variables ?? [] },
      { name: "session", variables: sessionVariables },
    ];
    const vars = variablesFromScopes(varScopes);

    // Pre-request script
    let resolved: RequestConfig;
    let unresolved: string[] = [];
    try {
      const scriptCtx = await runPreRequestScript(
        request as RequestConfig,
        vars,
        request.scripts?.preRequest ?? "",
      );
      const result = resolveRequest(
        (scriptCtx.request ?? request) as RequestConfig,
        env,
        sessionVariables,
      );
      resolved = result.request;
      unresolved = result.unresolved;
    } catch {
      const result = resolveRequest(
        request as RequestConfig,
        env,
        sessionVariables,
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

    // Inject matching cookies
    if (enableCookies && cookies.length > 0) {
      const matched = matchCookies(cookies, resolved.url);
      if (matched.length > 0) {
        const cookieHeader = buildCookieHeader(matched);
        const existing = resolved.headers.find((h) => h.key.toLowerCase() === "cookie");
        if (existing) {
          resolved = {
            ...resolved,
            headers: resolved.headers.map((h) =>
              h.key.toLowerCase() === "cookie"
                ? { ...h, value: h.value ? `${h.value}; ${cookieHeader}` : cookieHeader }
                : h,
            ),
          };
        } else {
          resolved = { ...resolved, headers: [...resolved.headers, { key: "Cookie", value: cookieHeader, enabled: true }] };
        }
      }
    }

    // Store resolved request for auth debugger
    set({ resolvedRequest: resolved });

    // OAuth2 token application
    if (resolved.auth?.type === "oauth2") {
      const flow = resolved.auth.flow ?? "client_credentials";
      if (flow === "authorization_code" && resolved.auth.accessToken) {
        // Use stored token; warn if expired
        if (resolved.auth.tokenExpiresAt && resolved.auth.tokenExpiresAt < Date.now()) {
          addToast("warn", "OAuth2 token may be expired — re-authorize in the Auth tab");
        }
        resolved = {
          ...resolved,
          auth: { ...resolved.auth, type: "bearer", token: resolved.auth.accessToken },
        };
      } else if (flow === "client_credentials") {
        try {
          const tok = await oauth2ClientCredentials(resolved.auth);
          if (tok.accessToken) {
            resolved = {
              ...resolved,
              auth: { ...resolved.auth, type: "bearer", token: tok.accessToken },
            };
          }
        } catch (e) {
          addToast("warn", `OAuth2: ${e}`);
        }
      }
    }

    const persistCookies = async (res: { headers: { key: string; value: string }[] }, url: string) => {
      if (!enableCookies) return;
      const setCookieHeaders = res.headers
        .filter((h) => h.key.toLowerCase() === "set-cookie")
        .map((h) => h.value);
      if (setCookieHeaders.length === 0) return;
      const parsed = parseCookieHeaders(setCookieHeaders, url);
      await coreStore.upsertCookies(parsed);
      const updated = await coreStore.listCookies();
      set({ cookies: updated });
    };

    if (streamMode) {
      const controller = new AbortController();
      set({
        streaming: true,
        loading: false,
        response: undefined,
        streamBytes: 0,
        streamController: controller,
      });
      try {
        await executeStream(resolved, {
          onChunk: (chunk) =>
            set((s: { streamBytes: number }) => ({
              streamBytes: s.streamBytes + chunk.length,
            })),
          onFinal: async (res) => {
            await persistCookies(res, resolved.url);
            const results = runAssertions(res, assertionRules);
            const extracted = extractVariables(res, extractRules);
            await coreStore.addHistory({
              request: resolved,
              response: res,
              protocol: "rest",
            });
            const hist = await coreStore.listHistory(200);
            set({
              response: res,
              assertionResults: results,
              sessionVariables: { ...sessionVariables, ...extracted },
              streaming: false,
              history: hist,
            });
          },
          signal: controller.signal,
        });
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") addToast("error", String(e));
        set({ streaming: false });
      }
    } else {
      set({ loading: true, response: undefined });
      try {
        const res = await executeWithRetry(resolved);
        await persistCookies(res, resolved.url);

        try {
          await runPostResponseScript(
            resolved,
            res,
            vars,
            request.scripts?.postResponse ?? "",
          );
        } catch {
          /* ignore script errors */
        }

        const results = runAssertions(res, assertionRules);
        const extracted = extractVariables(res, extractRules);
        await coreStore.addHistory({
          request: resolved,
          response: res,
          protocol: "rest",
        });
        const hist = await coreStore.listHistory(200);
        set({
          response: res,
          assertionResults: results,
          sessionVariables: { ...sessionVariables, ...extracted },
          loading: false,
          history: hist,
        });
      } catch (e) {
        addToast("error", String(e));
        set({ loading: false });
      }
    }
  }, [
    request,
    environments,
    activeEnvironmentId,
    sessionVariables,
    assertionRules,
    extractRules,
    streamMode,
    loading,
    streaming,
    cookies,
    enableCookies,
    addToast,
    set,
  ]); // eslint-disable-line

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleSend]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main pane */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Request pane */}
          <div
            className="overflow-hidden"
            style={{ height: requestHeight, flexShrink: 0 }}
          >
            <RequestBuilder onSend={handleSend} />
          </div>

          {/* Resize handle */}
          <div className="resize-handle-v" onMouseDown={onResizeMouseDown} />

          {/* Response pane */}
          <div className="flex-1 overflow-hidden">
            <ResponseViewer />
          </div>
        </div>
      </div>

      <CommandPalette />
      <Toasts />
      <DiffModal />
      <VariableEditorModal />
      <HelpModal />
      <ClearHistoryModal />
      <SettingsPanel />
      <CollectionRunnerModal />
      <BatchRunnerModal />
      <CookieManagerModal />
    </div>
  );
}
