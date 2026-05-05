import { useCallback, useEffect, useRef, useState } from "react";
import {
  extractVariables,
  generateCodeSnippet,
  resolveRequest,
  runPostResponseScript,
  runPreRequestScript,
  runAssertions,
  variablesFromScopes,
  type RequestConfig,
  type VariableScope
} from "@invoke/core";
import { useStore, coreStore } from "./store";
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { RequestBuilder } from "./components/request/RequestBuilder";
import { ResponseViewer } from "./components/response/ResponseViewer";
import { CommandPalette } from "./components/palette/CommandPalette";
import { Toasts } from "./components/shared/Toast";
import { execute, executeStream, oauth2ClientCredentials } from "./lib/api";

// ── Resize hook ──────────────────────────────────────────────

function useResize(initial: number) {
  const [size, setSize] = useState(initial);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(initial);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startPos.current = e.clientY;
    startSize.current = size;
    e.preventDefault();
  }, [size]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientY - startPos.current;
      setSize(Math.max(120, Math.min(startSize.current + delta, window.innerHeight - 200)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  return { size, onMouseDown };
}

export default function App() {
  const {
    request, environments, activeEnvironmentId,
    sessionVariables, assertionRules, extractRules,
    streamMode, codeTarget, response,
    set, addToast, loading, streaming
  } = useStore();

  const { size: requestHeight, onMouseDown: onResizeMouseDown } = useResize(320);

  // ── Bootstrap ────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const [cols, envs, hist, fls, activeEnvId] = await Promise.all([
          coreStore.listCollections(),
          coreStore.listEnvironments(),
          coreStore.listHistory(200),
          coreStore.listFlows(),
          coreStore.getActiveEnvironmentId()
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
          activeEnvironmentId: activeEnvId
        });
      } catch (e) { addToast("error", `Failed to load data: ${e}`); }
    };
    load();
  }, []); // eslint-disable-line

  // ── Persist active environment ────────────────────────────

  useEffect(() => {
    coreStore.setActiveEnvironmentId(activeEnvironmentId).catch(() => {});
  }, [activeEnvironmentId]);

  // ── Code generation ──────────────────────────────────────

  useEffect(() => {
    if (!response) return;
    let cancelled = false;
    set({ codeLoading: true });
    (async () => {
      try {
        const env = environments.find((e) => e.id === activeEnvironmentId);
        const { request: resolved } = resolveRequest(request as RequestConfig, env, sessionVariables);
        const snippet = await generateCodeSnippet(resolved, codeTarget);
        if (!cancelled) set({ codeSnippet: snippet.code, codeLoading: false });
      } catch { if (!cancelled) set({ codeSnippet: "", codeLoading: false }); }
    })();
    return () => { cancelled = true; };
  }, [response, codeTarget]); // eslint-disable-line

  // ── Send handler ─────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (loading || streaming || !request.url.trim()) return;

    const env = environments.find((e) => e.id === activeEnvironmentId);
    const varScopes: VariableScope[] = [
      { name: "environment", variables: env?.variables ?? [] },
      { name: "session", variables: sessionVariables }
    ];
    const vars = variablesFromScopes(varScopes);

    // Pre-request script
    let resolved: RequestConfig;
    try {
      const scriptCtx = await runPreRequestScript(request as RequestConfig, vars, request.scripts?.preRequest ?? "");
      const { request: r } = resolveRequest((scriptCtx.request ?? request) as RequestConfig, env, sessionVariables);
      resolved = r;
    } catch {
      const { request: r } = resolveRequest(request as RequestConfig, env, sessionVariables);
      resolved = r;
    }

    // OAuth2 client credentials auto-fetch
    if (resolved.auth?.type === "oauth2") {
      try {
        const tok = await oauth2ClientCredentials(resolved.auth);
        if (tok.accessToken) {
          resolved = { ...resolved, auth: { ...resolved.auth, type: "bearer", token: tok.accessToken } };
        }
      } catch (e) { addToast("warn", `OAuth2: ${e}`); }
    }

    if (streamMode) {
      const controller = new AbortController();
      set({ streaming: true, loading: false, response: undefined, streamBytes: 0, streamController: controller });
      try {
        await executeStream(resolved, {
          onChunk: (chunk) => set((s: { streamBytes: number }) => ({ streamBytes: s.streamBytes + chunk.length })),
          onFinal: async (res) => {
            const results = runAssertions(res, assertionRules);
            const extracted = extractVariables(res, extractRules);
            await coreStore.addHistory({ request: resolved, response: res, protocol: "rest" });
            const hist = await coreStore.listHistory(200);
            set({ response: res, assertionResults: results, sessionVariables: { ...sessionVariables, ...extracted }, streaming: false, history: hist });
          },
          signal: controller.signal
        });
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") addToast("error", String(e));
        set({ streaming: false });
      }
    } else {
      set({ loading: true, response: undefined });
      try {
        const res = await execute(resolved);

        try { await runPostResponseScript(resolved, res, vars, request.scripts?.postResponse ?? ""); } catch { /* ignore script errors */ }

        const results = runAssertions(res, assertionRules);
        const extracted = extractVariables(res, extractRules);
        await coreStore.addHistory({ request: resolved, response: res, protocol: "rest" });
        const hist = await coreStore.listHistory(200);
        set({ response: res, assertionResults: results, sessionVariables: { ...sessionVariables, ...extracted }, loading: false, history: hist });
      } catch (e) {
        addToast("error", String(e));
        set({ loading: false });
      }
    }
  }, [request, environments, activeEnvironmentId, sessionVariables, assertionRules, extractRules, streamMode, loading, streaming, addToast, set]); // eslint-disable-line

  // ── Keyboard shortcuts ───────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSend(); }
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
          <div className="overflow-hidden" style={{ height: requestHeight, flexShrink: 0 }}>
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
    </div>
  );
}
