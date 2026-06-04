import { useMemo, useState } from "react";
import {
  resolveTemplate,
  variablesFromScopes,
  type HttpMethod,
  type KeyValue,
  type VariableScope,
} from "@invoke/core";
import { useCollections, useFolders } from "../../../hooks/useDb";
import { useStore } from "../../../store";
import type { URLBarProps } from "../../../types";
import { MethodDropdown } from "./url-bar/MethodDropdown";
import { RequestUrlInput } from "./url-bar/RequestUrlInput";
import { URLBarActions } from "./url-bar/URLBarActions";
import { VariableInspector } from "./url-bar/VariableInspector";

export function URLBar({ onSend, loading }: URLBarProps) {
  const {
    request,
    setRequest,
    streamMode,
    set,
    environments,
    activeEnvironmentId,
    sessionVariables,
    loadController,
    requests: savedRequests,
  } = useStore();
  const collections = useCollections();
  const folders = useFolders();
  const [showVars, setShowVars] = useState(false);
  const { unresolved, scopedVars } = useMemo(
    () =>
      collectUrlVariables({
        request,
        savedRequests,
        environments,
        activeEnvironmentId,
        collections,
        folders,
        sessionVariables,
      }),
    [
      activeEnvironmentId,
      collections,
      environments,
      folders,
      request,
      savedRequests,
      sessionVariables,
    ],
  );

  return (
    <div className="flex items-center gap-2 px-3 py-2" data-tour="url-bar">
      {request.protocol !== "graphql" && (
        <MethodDropdown
          method={request.method}
          onChange={(method: HttpMethod) => setRequest({ method })}
        />
      )}
      <RequestUrlInput
        url={request.url}
        params={request.params ?? []}
        pathVariables={request.pathVariables ?? []}
        unresolved={unresolved}
        onSend={onSend}
        onPatch={(patch) => setRequest(patch as any)}
      />
      <VariableInspector
        open={showVars}
        scopedVars={scopedVars}
        unresolved={unresolved}
        onToggle={() => setShowVars((value) => !value)}
      />
      <URLBarActions
        loading={loading}
        streamMode={streamMode}
        canCancel={!!loadController}
        canSend={request.url.trim().length > 0}
        onBatch={() => set({ showBatchRunner: true })}
        onToggleStream={() => set({ streamMode: !streamMode })}
        onCancel={() => loadController?.abort()}
        onSend={onSend}
      />
    </div>
  );
}

function collectUrlVariables({
  request,
  savedRequests,
  environments,
  activeEnvironmentId,
  collections,
  folders,
  sessionVariables,
}: any) {
  const env = environments.find((item: any) => item.id === activeEnvironmentId);
  const savedReq = request.id
    ? savedRequests.find((item: any) => item.id === request.id)
    : undefined;
  const collectionId = savedReq?.collectionId ?? request.collectionId;
  const folderId = savedReq?.folderId ?? request.folderId;
  const collection = collections.find((item: any) => item.id === collectionId);
  const folder = folders.find((item: any) => item.id === folderId);
  const scopes: VariableScope[] = [
    { name: "environment", variables: env?.variables ?? [] },
    { name: "collection", variables: collection?.variables ?? [] },
    { name: "folder", variables: folder?.variables ?? [] },
    { name: "session", variables: sessionVariables },
  ];
  return {
    unresolved: resolveTemplate(request.url, variablesFromScopes(scopes)).unresolved,
    scopedVars: scopedVariables(scopes),
  };
}

function scopedVariables(scopes: VariableScope[]) {
  const seen = new Set<string>();
  const scopedVars: { key: string; value: string; scope: string }[] = [];
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    const variables = Array.isArray(scope.variables)
      ? scope.variables.filter((variable) => variable.enabled !== false && variable.key.trim())
      : Object.entries(scope.variables as Record<string, string>).map(([key, value]) => ({
          key,
          value,
          enabled: true,
        }));
    for (const variable of variables) {
      if (!seen.has(variable.key)) {
        seen.add(variable.key);
        scopedVars.push({
          key: variable.key,
          value: (variable as KeyValue).sensitive ? "******" : variable.value,
          scope: scope.name ?? "",
        });
      }
    }
  }
  return scopedVars.sort((a, b) => a.key.localeCompare(b.key));
}
