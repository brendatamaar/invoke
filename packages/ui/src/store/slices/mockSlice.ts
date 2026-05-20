import type { AppState } from "../../types";

export type MockSlice = Pick<
  AppState,
  "mockRoutes" | "mockLogs" | "mockTotalLogs" | "mockStatus"
>;

export function createMockSlice(): MockSlice {
  return {
    mockRoutes: [],
    mockLogs: [],
    mockTotalLogs: 0,
    mockStatus: "",
  };
}
