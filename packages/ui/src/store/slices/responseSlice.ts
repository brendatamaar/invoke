import type { StateCreator } from "zustand";
import type { AppState } from "../../types";

export type ResponseSlice = Pick<
  AppState,
  | "response"
  | "responseTab"
  | "assertionResults"
  | "responsePretty"
  | "responseSearch"
  | "codeTarget"
  | "codeSnippet"
  | "codeLoading"
  | "loading"
  | "streaming"
  | "streamMode"
  | "streamBytes"
  | "streamController"
  | "resolvedRequest"
>;

type StoreSet = Parameters<StateCreator<AppState>>[0];

export function createResponseSlice(_set: StoreSet): ResponseSlice {
  return {
    response: undefined,
    responseTab: "body",
    assertionResults: [],
    responsePretty: true,
    responseSearch: "",
    codeTarget: "curl",
    codeSnippet: "",
    codeLoading: false,
    loading: false,
    streaming: false,
    streamMode: false,
    streamBytes: 0,
    streamController: undefined,
    resolvedRequest: undefined,
  };
}
