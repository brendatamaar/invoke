import type { AppState } from "../../types";

export type MockSlice = Record<string, never>;

export function createMockSlice(): MockSlice {
  return {};
}
