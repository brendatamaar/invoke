import type { AppState } from "../../types";

export type ExamplesSlice = Pick<AppState, "responseExamples">;

export function createExamplesSlice(): ExamplesSlice {
  return {
    responseExamples: [],
  };
}
