import type { WorkspaceBackup } from "./types";

export function serializeWorkspace(
  data: Omit<WorkspaceBackup, "version" | "exportedAt">,
): WorkspaceBackup {
  return {
    version: "1.0",
    exportedAt: Date.now(),
    ...data,
  };
}

export function parseWorkspaceBackup(json: string): WorkspaceBackup {
  const parsed = JSON.parse(json) as Partial<WorkspaceBackup>;
  if (parsed.version !== "1.0")
    throw new Error("Unsupported workspace version");
  return {
    version: "1.0",
    exportedAt: parsed.exportedAt ?? Date.now(),
    collections: parsed.collections ?? [],
    folders: parsed.folders ?? [],
    requests: parsed.requests ?? [],
    environments: parsed.environments ?? [],
    flows: parsed.flows ?? [],
    defaultProtocolOptions: parsed.defaultProtocolOptions,
  };
}
