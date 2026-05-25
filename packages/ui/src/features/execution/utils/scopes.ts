import {
  variablesFromScopes,
  type Collection,
  type Environment,
  type Folder,
  type RequestConfig,
  type RequestDraft,
  type SavedRequest,
  type VariableScope,
} from "@invoke/core";

export function buildExecutionScopeContext({
  request,
  activeRequest,
  requests,
  collections,
  folders,
  environments,
  activeEnvironmentId,
  sessionVariables,
}: {
  request: RequestDraft;
  activeRequest: RequestDraft;
  requests: SavedRequest[];
  collections: Collection[];
  folders: Folder[];
  environments: Environment[];
  activeEnvironmentId: string | undefined;
  sessionVariables: Record<string, string>;
}) {
  const environment = environments.find((item) => item.id === activeEnvironmentId);
  const savedRequest = request.id
    ? requests.find((item) => item.id === request.id)
    : undefined;
  const collectionId = savedRequest?.collectionId ?? request.collectionId;
  const folderId = savedRequest?.folderId ?? request.folderId;
  const collection = collections.find((item) => item.id === collectionId);
  const folder = folders.find((item) => item.id === folderId);

  const buildScopes = (requestConfig: RequestConfig): VariableScope[] => [
    { name: "environment", variables: environment?.variables ?? [] },
    { name: "collection", variables: collection?.variables ?? [] },
    { name: "folder", variables: folder?.variables ?? [] },
    { name: "request", variables: requestConfig.variables ?? [] },
    { name: "session", variables: sessionVariables },
  ];

  return {
    buildScopes,
    vars: variablesFromScopes(buildScopes(activeRequest as RequestConfig)),
  };
}
