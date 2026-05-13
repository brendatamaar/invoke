import { useEffect } from "react";
import {
  generateCodeSnippet,
  resolveRequest,
  type RequestConfig,
} from "@invoke/core";
import { applyProtocolDefaults } from "../../lib/protocolDefaults";
import { useStore } from "../../store";

export function useCodeSnippetGeneration() {
  const request = useStore((state) => state.request);
  const environments = useStore((state) => state.environments);
  const activeEnvironmentId = useStore((state) => state.activeEnvironmentId);
  const sessionVariables = useStore((state) => state.sessionVariables);
  const codeTarget = useStore((state) => state.codeTarget);
  const response = useStore((state) => state.response);
  const set = useStore((state) => state.set);

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
        const snippet = await generateCodeSnippet(
          applyProtocolDefaults(resolved),
          codeTarget,
        );
        if (!cancelled) set({ codeSnippet: snippet.code, codeLoading: false });
      } catch {
        if (!cancelled) set({ codeSnippet: "", codeLoading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeEnvironmentId,
    codeTarget,
    environments,
    request,
    response,
    sessionVariables,
    set,
  ]);
}
