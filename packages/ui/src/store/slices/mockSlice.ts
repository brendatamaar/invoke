import type { AppState } from "../../types";

export type MockSlice = Pick<
  AppState,
  "mockLogs" | "mockTotalLogs" | "mockStatus" | "proxyRecordsTick"
>;

export function createMockSlice(): MockSlice {
  return {
    mockLogs: [],
    mockTotalLogs: 0,
    mockStatus: "",
    proxyRecordsTick: 0,
  };
}
