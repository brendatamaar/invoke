import type { AppState } from "../../types";

export type MockSlice = Pick<
  AppState,
  "mockRoutes" | "mockLogs" | "mockStatus"
>;

export function createMockSlice(): MockSlice {
  return {
    mockRoutes: [],
    mockLogs: [],
    mockStatus: "",
  };
}
