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
  | "loading"
  | "loadController"
  | "retryAttempts"
  | "apqRetried"
  | "streaming"
  | "streamMode"
  | "streamBytes"
  | "streamController"
  | "browserMode"
  | "responseBrowserMode"
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
    loading: false,
    loadController: undefined,
    retryAttempts: undefined,
    apqRetried: undefined,
    streaming: false,
    streamMode: false,
    streamBytes: 0,
    streamController: undefined,
    browserMode: window.location.hostname === "runinvoke.com",
    responseBrowserMode: false,
    resolvedRequest: undefined,
  };
}
