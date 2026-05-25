import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  generateCodeSnippet,
  resolveRequest,
  type RequestConfig,
} from "@invoke/core";
import { applyProtocolDefaults } from "../../lib/protocolDefaults";
import { useStore } from "../../store";

function stableRequestHash(
  request: Record<string, unknown>,
  activeEnvironmentId: string | undefined,
  sessionVariables: Record<string, string>,
): string {
  const fields = {
    method: request.method,
    url: request.url,
    params: request.params,
    headers: request.headers,
    bodyMode: request.bodyMode,
    body: request.body,
    auth: request.auth,
    timeoutMs: request.timeoutMs,
    protocol: request.protocol,
    activeEnvironmentId,
    sessionVariables,
  };
  return JSON.stringify(fields);
}

export function useCodeSnippetGeneration() {
  const request = useStore((s) => s.request);
  const environments = useStore((s) => s.environments);
  const activeEnvironmentId = useStore((s) => s.activeEnvironmentId);
  const sessionVariables = useStore((s) => s.sessionVariables);
  const codeTarget = useStore((s) => s.codeTarget);
  const response = useStore((s) => s.response);

  const env = useMemo(
    () => environments.find((e) => e.id === activeEnvironmentId),
    [environments, activeEnvironmentId],
  );

  const requestHash = useMemo(
    () =>
      stableRequestHash(
        request as unknown as Record<string, unknown>,
        activeEnvironmentId,
        sessionVariables,
      ),
    [request, activeEnvironmentId, sessionVariables],
  );

  return useQuery({
    queryKey: ["codegen", requestHash, codeTarget],
    queryFn: async () => {
      const { request: resolved } = resolveRequest(
        request as RequestConfig,
        env,
        sessionVariables,
      );
      const snippet = await generateCodeSnippet(
        applyProtocolDefaults(resolved),
        codeTarget,
      );
      return snippet.code;
    },
    enabled: !!response,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
