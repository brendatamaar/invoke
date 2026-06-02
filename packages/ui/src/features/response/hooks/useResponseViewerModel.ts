import { useState } from "react";
import { evaluateJsonPath } from "@invoke/core";
import type { HttpMethod } from "@invoke/core";
import { coreStore, useStore } from "../../../store";
import { useHistory, useMockRoutes, useResponseExamples } from "../../../hooks/useDb";
import type { AssertionDraft, ExtractionDraft } from "../../../types";
import { parseGraphQLErrors, parseGraphQLCost } from "../utils/graphqlErrors";
import { getBodyInfo, responsePath } from "../utils/body";

export function useResponseViewerModel() {
  const store = useStore();
  const responseExamples = useResponseExamples();
  const history = useHistory(2);
  const mockRoutes = useMockRoutes();
  const [overlay, setOverlay] = useState<
    | { kind: "assertion"; draft: AssertionDraft }
    | { kind: "extraction"; draft: ExtractionDraft }
    | { kind: "saveExample" }
    | null
  >(null);
  const [exampleName, setExampleName] = useState("");
  const [jsonPathInput, setJsonPathInput] = useState("");
  const [jsonPathResult, setJsonPathResult] = useState<string | null>(null);

  const { response, responsePretty, assertionResults, request, consoleLogs } = store;
  const graphqlErrors = response ? parseGraphQLErrors(response.body) : [];
  const { cost: gqlCost, complexity: gqlComplexity } = response
    ? parseGraphQLCost(response.body)
    : { cost: null, complexity: null };
  const passedCount = assertionResults.filter((r) => r.passed).length;
  const totalCount = assertionResults.length;
  const hasConsoleLogs =
    consoleLogs.preRequest.length > 0 ||
    consoleLogs.postResponse.length > 0 ||
    !!consoleLogs.preRequestError ||
    !!consoleLogs.postResponseError;
  const hasConsoleError = !!consoleLogs.preRequestError || !!consoleLogs.postResponseError;
  const isGraphQL = request.protocol === "graphql";
  const hasGraphQLTab = isGraphQL;
  const bodyInfo = getBodyInfo(response, responsePretty);

  const setJsonPath = (value: string) => {
    setJsonPathInput(value);
    if (response && value.trim()) {
      const result = evaluateJsonPath(response.body, value);
      setJsonPathResult(
        result.error ? `Error: ${result.error}` : JSON.stringify(result.value, null, 2),
      );
    } else {
      setJsonPathResult(null);
    }
  };

  const addAssertion = (draft: AssertionDraft) => {
    store.set((s) => ({
      assertionRules: [
        ...s.assertionRules,
        { id: Math.random().toString(36).slice(2), ...draft, enabled: true },
      ],
      requestTab: "assertions",
    }));
    setOverlay(null);
    store.addToast("success", "Assertion added");
  };

  const addExtraction = (draft: ExtractionDraft) => {
    store.set((s) => ({
      extractRules: [
        ...s.extractRules,
        { id: Math.random().toString(36).slice(2), ...draft, enabled: true },
      ],
      requestTab: "extract",
    }));
    setOverlay(null);
    store.addToast("success", "Extraction rule added");
  };

  const saveExample = async () => {
    if (!response) return;
    const name = exampleName.trim() || `Example ${responseExamples.length + 1}`;
    const example = {
      id: Math.random().toString(36).slice(2),
      name,
      requestId: (request as { id?: string })?.id,
      status: response.status,
      headers: response.headers,
      body: response.body,
      createdAt: Date.now(),
    };
    try {
      await coreStore.saveResponseExample(example);
      store.addToast("success", `Saved as "${name}"`);
    } catch (e) {
      store.addToast("error", String(e));
    }
    setOverlay(null);
    setExampleName("");
  };

  const createMock = () => {
    if (!response) return;
    const req = request as { method?: string; url?: string };
    const newRoute = {
      id: Math.random().toString(36).slice(2),
      enabled: true,
      method: (req?.method ?? "GET") as HttpMethod,
      pathPattern: responsePath(req?.url),
      status: response.status,
      headers: response.headers.filter(
        (h) =>
          !["content-encoding", "transfer-encoding", "connection"].includes(h.key.toLowerCase()),
      ),
      body: response.body,
      latencyMs: 0,
    };
    coreStore
      .setMeta("mockRoutes", [...mockRoutes, newRoute])
      .then(() => {
        store.set({ sidebarCollapsed: false, sidebarSection: "mocks" });
        store.addToast("success", "Mock route created");
      })
      .catch((error: unknown) =>
        store.addToast(
          "error",
          `Failed to create mock route: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
  };

  return {
    store,
    responseExamples,
    history,
    overlay,
    setOverlay,
    exampleName,
    setExampleName,
    jsonPathInput,
    jsonPathResult,
    setJsonPath,
    graphqlErrors,
    gqlCost,
    gqlComplexity,
    passedCount,
    totalCount,
    hasConsoleLogs,
    hasConsoleError,
    hasGraphQLTab,
    bodyInfo,
    addAssertion,
    addExtraction,
    saveExample,
    createMock,
  };
}
