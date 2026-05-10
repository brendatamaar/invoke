import type { AppState } from "../../types";

export type RunnerSlice = Pick<
  AppState,
  | "showCollectionRunner"
  | "collectionRunnerTarget"
  | "collectionRunResult"
  | "collectionRunning"
  | "showBatchRunner"
  | "batchRunResult"
  | "batchRunning"
>;

export function createRunnerSlice(): RunnerSlice {
  return {
    showCollectionRunner: false,
    collectionRunnerTarget: null,
    collectionRunResult: null,
    collectionRunning: false,
    showBatchRunner: false,
    batchRunResult: null,
    batchRunning: false,
  };
}
