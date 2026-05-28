import type { AppState } from "../../types";

export type FlowSlice = Pick<AppState, "flowDraft" | "flowResult" | "flowRunning" | "flowLog">;

export function createFlowSlice(): FlowSlice {
  return {
    flowDraft: {
      id: "",
      name: "New Flow",
      steps: [],
    } as unknown as AppState["flowDraft"],
    flowResult: undefined,
    flowRunning: false,
    flowLog: [],
  };
}
