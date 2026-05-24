import { create } from "zustand";
import type { AppState } from "../types";
import { coreStore } from "./coreStore";
import { createCookieSlice } from "./slices/cookieSlice";
import { createExamplesSlice } from "./slices/examplesSlice";
import { createFlowSlice } from "./slices/flowSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createMockSlice } from "./slices/mockSlice";
import { createProtocolSlice, makeWsSession, wsRequestKey } from "./slices/protocolSlice";
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
    set((s) => {
      const next = { ...s.wsSessionsByRequestId };
      for (const [key, sessions] of Object.entries(next)) {
        if (!sessions.some((sess) => sess.id === id)) continue;
        next[key] = sessions.map((sess) => sess.id === id ? { ...sess, ...partial } : sess);
        break;
      }
      return { wsSessionsByRequestId: next };
    }),

  addWsSession: () => {
    const s = get();
    const key = wsRequestKey(s.request.id);
    const currentSessions = s.wsSessionsByRequestId[key] ?? [];
    const usedNumbers = new Set(
      currentSessions.map((sess) => parseInt(sess.label.match(/^Session (\d+)$/)?.[1] ?? "0"))
    );
    let n = 1;
    while (usedNumbers.has(n)) n++;
    const newSession = makeWsSession(`Session ${n}`);
    set((prev) => ({
      wsSessionsByRequestId: {
        ...prev.wsSessionsByRequestId,
        [key]: [...(prev.wsSessionsByRequestId[key] ?? []), newSession],
      },
      activeWsSessionIdByRequestId: {
        ...prev.activeWsSessionIdByRequestId,
        [key]: newSession.id,
      },
    }));
    return newSession.id;
  },

  closeWsSession: (id) =>
    set((s) => {
      for (const [key, sessions] of Object.entries(s.wsSessionsByRequestId)) {
        if (!sessions.some((sess) => sess.id === id)) continue;
        const remaining = sessions.filter((sess) => sess.id !== id);
        const nextSession = remaining.length > 0 ? remaining[remaining.length - 1] : makeWsSession("Session 1");
        return {
          wsSessionsByRequestId: {
            ...s.wsSessionsByRequestId,
            [key]: remaining.length > 0 ? remaining : [nextSession],
          },
          activeWsSessionIdByRequestId: {
            ...s.activeWsSessionIdByRequestId,
            [key]: s.activeWsSessionIdByRequestId[key] === id ? nextSession.id : s.activeWsSessionIdByRequestId[key],
          },
        };
      }
      return {};
    }),
}));
