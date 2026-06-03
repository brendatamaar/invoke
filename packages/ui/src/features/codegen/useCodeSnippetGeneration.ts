import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { generateCodeSnippet, resolveRequest, type RequestConfig } from "@invoke/core";
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
  const resolvedRequest = useStore((s) => s.resolvedRequest);
  const environments = useStore((s) => s.environments);
  const activeEnvironmentId = useStore((s) => s.activeEnvironmentId);
  const sessionVariables = useStore((s) => s.sessionVariables);
  const codeTarget = useStore((s) => s.codeTarget);
  const response = useStore((s) => s.response);
  const protocol = useStore((s) => s.request.protocol);

  const env = useMemo(
    () => environments.find((e) => e.id === activeEnvironmentId),
    [environments, activeEnvironmentId],
  );

  const requestHash = useMemo(
    () =>
      stableRequestHash(
        (resolvedRequest ?? request) as unknown as Record<string, unknown>,
        activeEnvironmentId,
        sessionVariables,
      ),
    [resolvedRequest, request, activeEnvironmentId, sessionVariables],
  );

  return useQuery({
    queryKey: ["codegen", requestHash, codeTarget],
    queryFn: async () => {
      // For GraphQL/multipart, use the already-resolved request stored after execution.
      // For other protocols, resolve variables from the draft now.
      const base = resolvedRequest ?? request;
      const effective = resolvedRequest
        ? (resolvedRequest as RequestConfig)
        : resolveRequest(base as RequestConfig, env, sessionVariables).request;
      const snippet = await generateCodeSnippet(applyProtocolDefaults(effective), codeTarget);
      return snippet.code;
    },
    enabled: !!response || protocol === "websocket",
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
