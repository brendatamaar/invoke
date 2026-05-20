import type { AppState } from "../../types";

export type MockSlice = Pick<
  AppState,
  "mockRoutes" | "mockLogs" | "mockTotalLogs" | "mockStatus" | "proxyRecordsTick"
>;

export function createMockSlice(): MockSlice {
  return {
    mockRoutes: [],
    mockLogs: [],
    mockTotalLogs: 0,
    mockStatus: "",
    proxyRecordsTick: 0,
  };
}
