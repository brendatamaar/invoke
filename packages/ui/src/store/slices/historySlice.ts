import type { AppState } from "../../types";

export type HistorySlice = Pick<
  AppState,
  | "historyQuery"
  | "diffLeftId"
  | "diffRightId"
  | "showDiffModal"
>;

export function createHistorySlice(): HistorySlice {
  return {
    historyQuery: "",
    diffLeftId: "",
    diffRightId: "",
    showDiffModal: false,
  };
}
