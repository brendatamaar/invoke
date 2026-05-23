import { INITIAL_PROTOCOL_DEFAULTS } from "@invoke/core";
import type { StateCreator } from "zustand";
import type { AppState } from "../../types";

export type WorkspaceSlice = Pick<
  AppState,
  | "requests"
  | "protocolDefaults"
  | "expandedFolderIds"
  | "environments"
  | "activeEnvironmentId"
  | "sessionVariables"
  | "showEnvPanel"
  | "envDraft"
  | "variableEditor"
  | "toggleFolder"
>;

type StoreSet = Parameters<StateCreator<AppState>>[0];

export function createWorkspaceSlice(set: StoreSet): WorkspaceSlice {
  return {
    requests: [],
    protocolDefaults: INITIAL_PROTOCOL_DEFAULTS,
    expandedFolderIds: [],
    environments: [],
    activeEnvironmentId: undefined,
    sessionVariables: {},
    showEnvPanel: false,
    envDraft: undefined,
    variableEditor: { open: false, name: "", variables: [] },

    toggleFolder: (id) =>
      set((state) => ({
        expandedFolderIds: state.expandedFolderIds.includes(id)
          ? state.expandedFolderIds.filter((expandedId) => expandedId !== id)
          : [...state.expandedFolderIds, id],
      })),
  };
}
