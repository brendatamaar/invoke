import { create } from "zustand";
import type { AppState } from "../types";
import { coreStore } from "./coreStore";
import { createCookieSlice } from "./slices/cookieSlice";
import { createExamplesSlice } from "./slices/examplesSlice";
import { createFlowSlice } from "./slices/flowSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createMockSlice } from "./slices/mockSlice";
import { createProtocolSlice, makeWsSession } from "./slices/protocolSlice";
import { createRequestSlice } from "./slices/requestSlice";
import { createResponseSlice } from "./slices/responseSlice";
import { createRunnerSlice } from "./slices/runnerSlice";
import { createUiSlice } from "./slices/uiSlice";
import { createWorkspaceSlice } from "./slices/workspaceSlice";

export { coreStore };

export const useStore = create<AppState>((set, get) => ({
  // Request
  ...createRequestSlice(set, get),

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

  setWsSession: (id, partial) =>
    set((s) => ({
      wsSessions: s.wsSessions.map((sess) =>
        sess.id === id ? { ...sess, ...partial } : sess,
      ),
    })),

  addWsSession: () => {
    const s = get();
    const usedNumbers = new Set(
      s.wsSessions.map((sess) => parseInt(sess.label.match(/^Session (\d+)$/)?.[1] ?? "0"))
    );
    let n = 1;
    while (usedNumbers.has(n)) n++;
    const newSession = makeWsSession(`Session ${n}`);
    set((prev) => ({
      wsSessions: [...prev.wsSessions, newSession],
      activeWsSessionId: newSession.id,
    }));
    return newSession.id;
  },

  closeWsSession: (id) =>
    set((s) => {
      const remaining = s.wsSessions.filter((sess) => sess.id !== id);
      const nextSession =
        remaining.length > 0
          ? remaining[remaining.length - 1]
          : makeWsSession("Session 1");
      return {
        wsSessions: remaining.length > 0 ? remaining : [nextSession],
        activeWsSessionId:
          s.activeWsSessionId === id ? nextSession.id : s.activeWsSessionId,
      };
    }),
}));
