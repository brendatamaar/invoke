import { create } from "zustand";
import type { AppState } from "../types";
import { coreStore } from "./coreStore";
import { createCookieSlice } from "./slices/cookieSlice";
import { createExamplesSlice } from "./slices/examplesSlice";
import { createFlowSlice } from "./slices/flowSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createMockSlice } from "./slices/mockSlice";
import { createProtocolSlice } from "./slices/protocolSlice";
import { createRequestSlice } from "./slices/requestSlice";
import { createResponseSlice } from "./slices/responseSlice";
import { createRunnerSlice } from "./slices/runnerSlice";
import { createUiSlice } from "./slices/uiSlice";
import { createWorkspaceSlice } from "./slices/workspaceSlice";

export { coreStore };

export const useStore = create<AppState>((set, get) => ({
  // Request
  ...createRequestSlice(set),

  // Response
  ...createResponseSlice(set),

  // Workspace
  ...createWorkspaceSlice(set),

  // Protocols
  ...createProtocolSlice(),

  // History
  ...createHistorySlice(),

  // Flows
  ...createFlowSlice(),

  // Response examples
  ...createExamplesSlice(),

  // Mock server
  ...createMockSlice(),

  // Collection runner
  ...createRunnerSlice(),

  // Cookies
  ...createCookieSlice(),

  // UI
  ...createUiSlice(set, get),

  // Actions
  set: (partial) => {
    if (typeof partial === "function")
      set((s) => (partial as (s: AppState) => Partial<AppState>)(s));
    else set(partial);
  },
}));
