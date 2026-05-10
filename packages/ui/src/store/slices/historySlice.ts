import type { AppState } from "../../types";

export type HistorySlice = Pick<
  AppState,
  | "history"
  | "historyQuery"
  | "retentionSettings"
  | "diffLeftId"
  | "diffRightId"
  | "showDiffModal"
  | "diffIgnoreRules"
>;

export function createHistorySlice(): HistorySlice {
  return {
    history: [],
    historyQuery: "",
    retentionSettings: undefined,
    diffLeftId: "",
    diffRightId: "",
    showDiffModal: false,
    diffIgnoreRules: [],
  };
}
