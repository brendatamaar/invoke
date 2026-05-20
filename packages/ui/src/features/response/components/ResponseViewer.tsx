import { useState } from "react";
import type { ReactNode } from "react";
import { useStore, coreStore } from "../../../store";
import { StatusBadge } from "../../../components/shared/StatusBadge";
import type {
  AssertionDraft,
  ExtractionDraft,
  ResponseTab,
} from "../../../types";
import {
  AlertCircle,
  AlertTriangle,
  Braces,
  Clock,
  HardDrive,
  Shield,
  CheckCircle,
  Code2,
  Eye,
  GitCompare,
  List,
  PlusCircle,
  Wand2,
  BookmarkPlus,
  Cpu,
  KeyRound,
  RefreshCw,
  Indent,
  Terminal,
} from "lucide-react";
import { evaluateJsonPath } from "@invoke/core";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { AssertionsTab } from "./AssertionsTab";
import { AuthDebugTab } from "./AuthDebugTab";
import { CodeTab } from "./CodeTab";
import { HeadersTab } from "./HeadersTab";
import { VisualizeTab } from "./VisualizeTab";
import {
  QuickAssertionOverlay,
  QuickExtractionOverlay,
  SaveExampleOverlay,
} from "./QuickResponseOverlays";
import { fmt, fmtSize } from "./responseFormatting";
import { TimingTab } from "./TimingTab";
import { TLSTab } from "./TLSTab";
import {
  GraphQLErrorsTab,
  parseGraphQLErrors,
  parseGraphQLCost,
} from "./GraphQLErrorsTab";
import { DeferredTab } from "./DeferredTab";
import { ConsoleTab } from "./ConsoleTab";

const STATIC_TABS: { id: ResponseTab; label: string; icon?: ReactNode }[] = [
  { id: "body", label: "Body" },
  { id: "headers", label: "Headers", icon: <List size={11} /> },
  { id: "timing", label: "Timing", icon: <Clock size={11} /> },
  { id: "tls", label: "TLS", icon: <Shield size={11} /> },
  { id: "assertions", label: "Assertions", icon: <CheckCircle size={11} /> },
  { id: "auth", label: "Auth", icon: <KeyRound size={11} /> },
  { id: "code", label: "Code", icon: <Code2 size={11} /> },
  { id: "visualize", label: "Visualize", icon: <Eye size={11} /> },
];

export function ResponseViewer() {
  const {
    response,
    responseTab,
    responsePretty,
    set,
    streaming,
    streamBytes,
    assertionResults,
    assertionRules,
    extractRules,
    request,
    responseExamples,
    history,
    mockRoutes,
    addToast,
    retryAttempts,
    graphqlDeferredParts,
    consoleLogs,
  } = useStore();

  const hasConsoleLogs =
    consoleLogs.preRequest.length > 0 ||
    consoleLogs.postResponse.length > 0 ||
    !!consoleLogs.preRequestError ||
    !!consoleLogs.postResponseError;
  const hasConsoleError =
    !!consoleLogs.preRequestError || !!consoleLogs.postResponseError;
  const isGraphQL = request.protocol === "graphql";
  const graphqlErrors = response ? parseGraphQLErrors(response.body) : [];
  const hasGraphQLErrors = graphqlErrors.length > 0;
  const { cost: gqlCost, complexity: gqlComplexity } = response
    ? parseGraphQLCost(response.body)
    : { cost: null, complexity: null };
  const hasGraphQLTab =
    isGraphQL &&
    (hasGraphQLErrors || gqlCost !== null || gqlComplexity !== null);

  const [overlay, setOverlay] = useState<
    | { kind: "assertion"; draft: AssertionDraft }
    | { kind: "extraction"; draft: ExtractionDraft }
    | { kind: "saveExample" }
    | null
  >(null);
  const [exampleName, setExampleName] = useState("");
  const [jsonPathInput, setJsonPathInput] = useState("");
  const [jsonPathResult, setJsonPathResult] = useState<string | null>(null);

  if (!response && !streaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
        <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mb-2">
          <Code2 size={18} className="text-[var(--text-3)]" />
        </div>
        <p className="text-sm text-[var(--text-2)] font-medium">
          Send a request to see the response
        </p>
        <p className="text-xs text-[var(--text-3)]">
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono text-2xs">
            Ctrl+Enter
          </kbd>{" "}
          to send
        </p>
      </div>
    );
  }

  if (response?.status === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
        <div className="w-10 h-10 rounded bg-[var(--danger-bg)] border border-[var(--danger)] flex items-center justify-center mb-2">
          <Code2 size={18} className="text-[var(--danger)]" />
        </div>
        <p className="text-sm text-[var(--text-2)] font-medium">
          Request failed
        </p>
        {response.error && (
          <p className="text-xs text-[var(--danger)] font-mono max-w-md break-all">
            {response.error}
          </p>
        )}
      </div>
    );
  }

  const passedCount = assertionResults.filter((r) => r.passed).length;
  const totalCount = assertionResults.length;

  const ct = response
    ? ((Array.isArray(response.headers)
        ? response.headers.find((h) => h.key.toLowerCase() === "content-type")
            ?.value
        : "") ?? "")
    : "";
  const isJson = response
    ? ct.includes("json") ||
      (() => {
        try {
          JSON.parse(response.body);
          return true;
        } catch {
          return false;
        }
      })()
    : false;
  const lang = isJson
    ? "json"
    : ct.includes("xml") || ct.includes("html")
      ? "xml"
      : "text";
  const displayBody =
    response && isJson && responsePretty
      ? (() => {
          try {
            return JSON.stringify(JSON.parse(response.body), null, 2);
          } catch {
            return response.body;
          }
        })()
      : (response?.body ?? "");

  const addAssertion = (draft: AssertionDraft) => {
    set((s) => ({
      assertionRules: [
        ...s.assertionRules,
        {
          id: Math.random().toString(36).slice(2),
          ...draft,
          enabled: true,
        },
      ],
      requestTab: "assertions",
    }));
    setOverlay(null);
    addToast("success", "Assertion added");
  };

  const addExtraction = (draft: ExtractionDraft) => {
    set((s) => ({
      extractRules: [
        ...s.extractRules,
        { id: Math.random().toString(36).slice(2), ...draft, enabled: true },
      ],
      requestTab: "extract",
    }));
    setOverlay(null);
    addToast("success", "Extraction rule added");
  };

  const saveExample = async () => {
    if (!response) return;
    const name = exampleName.trim() || `Example ${responseExamples.length + 1}`;
    const req = request as { id?: string };
    const example = {
      id: Math.random().toString(36).slice(2),
      name,
      requestId: req?.id,
      status: response.status,
      headers: response.headers,
      body: response.body,
      createdAt: Date.now(),
    };
    try {
      await coreStore.saveResponseExample(example);
      set((s) => ({ responseExamples: [...s.responseExamples, example] }));
      addToast("success", `Saved as "${name}"`);
    } catch (e) {
      addToast("error", String(e));
    }
    setOverlay(null);
    setExampleName("");
  };

  const createMock = () => {
    if (!response) return;
    const req = request as { method?: string; url?: string };
    let path = "/";
    try {
      path = new URL(req?.url ?? "").pathname || "/";
    } catch {
      path = req?.url ?? "/";
    }
    const newRoute = {
      id: Math.random().toString(36).slice(2),
      enabled: true,
      method: (req?.method ?? "GET") as import("@invoke/core").HttpMethod,
      pathPattern: path,
      status: response.status,
      headers: response.headers.filter(
        (h) =>
          !["content-encoding", "transfer-encoding", "connection"].includes(
            h.key.toLowerCase(),
          ),
      ),
      body: response.body,
      latencyMs: 0,
    };
    set((s) => ({
      mockRoutes: [...s.mockRoutes, newRoute],
      sidebarSection: "mocks",
    }));
    addToast("success", "Mock route created");
  };

  return (
    <div className="flex flex-col h-full relative">
      {response && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-2)]">
          <StatusBadge status={response.status} showLabel />
          <span className="ml-auto text-2xs text-[var(--text-3)] flex items-center gap-1">
            <Clock size={11} /> {fmt(response.timing?.totalMs ?? 0)}
          </span>
          <span className="text-2xs text-[var(--text-3)] flex items-center gap-1">
            <HardDrive size={11} /> {fmtSize(response.responseSize ?? 0)}
          </span>
          {(retryAttempts ?? 0) > 0 && (
            <span className="text-2xs text-[var(--warn)] flex items-center gap-1">
              <RefreshCw size={11} /> {retryAttempts} retr
              {retryAttempts === 1 ? "y" : "ies"}
            </span>
          )}
          {gqlComplexity !== null && (
            <span
              className="text-2xs text-[var(--warn)] flex items-center gap-1"
              title="Query complexity"
            >
              ⚡ {gqlComplexity}
            </span>
          )}
          {gqlCost !== null && typeof gqlCost === "number" && (
            <span
              className="text-2xs text-[var(--warn)] flex items-center gap-1"
              title="Query cost"
            >
              ⚡ {gqlCost}
            </span>
          )}
          {gqlCost !== null &&
            typeof gqlCost === "object" &&
            gqlCost.requestedQueryCost != null && (
              <span
                className="text-2xs text-[var(--warn)] flex items-center gap-1"
                title={`Max: ${gqlCost.maximumAvailable ?? "?"}`}
              >
                ⚡ {gqlCost.requestedQueryCost}/
                {gqlCost.maximumAvailable ?? "?"}
              </span>
            )}
          {totalCount > 0 && (
            <span
              className={`text-2xs flex items-center gap-1 ${passedCount === totalCount ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
            >
              <CheckCircle size={11} /> {passedCount}/{totalCount}
            </span>
          )}
          {responseTab === "body" && isJson && (
            <div className="flex items-center gap-1 border-l border-[var(--border)] pl-2 ml-1">
              <button
                onClick={() => set({ responsePretty: !responsePretty })}
                className={`p-0.5 ${responsePretty ? "text-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--accent)]"}`}
                title="Pretty print"
              >
                <Indent size={11} />
              </button>
              <input
                value={jsonPathInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setJsonPathInput(val);
                  if (val.trim()) {
                    const r = evaluateJsonPath(response.body, val);
                    setJsonPathResult(
                      r.error
                        ? `Error: ${r.error}`
                        : JSON.stringify(r.value, null, 2),
                    );
                  } else {
                    setJsonPathResult(null);
                  }
                }}
                placeholder="$.path"
                className="input text-2xs py-0 px-1 w-28 font-mono"
                title="JSONPath playground — evaluate live"
              />
              <button
                onClick={() =>
                  setOverlay({
                    kind: "assertion",
                    draft: {
                      type: "bodyJsonPath",
                      expression: jsonPathInput,
                      matcher: "equals",
                      expected: "",
                    },
                  })
                }
                className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5 mr-2"
                title="Create assertion from JSONPath"
              >
                <PlusCircle size={11} />
              </button>
              <button
                onClick={() => {
                  const varName = jsonPathInput
                    .replace(/^\$\.?/, "")
                    .replace(/[^a-zA-Z0-9_]/g, "_")
                    .replace(/^_+|_+$/g, "");
                  setOverlay({
                    kind: "extraction",
                    draft: {
                      variableName: varName || "extracted",
                      source: "body",
                      expression: jsonPathInput,
                    },
                  });
                }}
                className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
                title="Create extraction from JSONPath"
              >
                <Wand2 size={11} />
              </button>
            </div>
          )}
          <button
            onClick={() => {
              setExampleName("");
              setOverlay({ kind: "saveExample" });
            }}
            className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
            title="Save as response example"
          >
            <BookmarkPlus size={11} />
          </button>
          <button
            onClick={createMock}
            className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
            title="Create mock route from this response"
          >
            <Cpu size={11} />
          </button>
          {history.length >= 2 && (
            <button
              onClick={() => {
                const [latest, previous] = history;
                set({
                  diffLeftId: previous.id,
                  diffRightId: latest.id,
                  showDiffModal: true,
                });
              }}
              className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
              title="Diff last two history entries"
            >
              <GitCompare size={11} />
            </button>
          )}
        </div>
      )}

      {streaming && !response && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--accent-subtle)]">
          <span className="text-xs text-[var(--accent)] animate-pulse">
            Streaming...
          </span>
          <span className="text-2xs text-[var(--text-3)]">
            {fmtSize(streamBytes)}
          </span>
        </div>
      )}

      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)]">
        {STATIC_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => set({ responseTab: tab.id })}
            className={`tab-btn flex items-center gap-1 ${responseTab === tab.id ? "active" : ""}`}
          >
            {tab.icon} {tab.label}
            {tab.id === "assertions" && totalCount > 0 && (
              <span
                className={`ml-0.5 text-2xs px-1 rounded ${passedCount === totalCount ? "bg-[var(--ok-bg)] text-[var(--ok)]" : "bg-[var(--danger-bg)] text-[var(--danger)]"}`}
              >
                {passedCount}/{totalCount}
              </span>
            )}
          </button>
        ))}
        {hasConsoleLogs && (
          <button
            onClick={() => set({ responseTab: "console" })}
            className={`tab-btn flex items-center gap-1 ${responseTab === "console" ? "active" : ""}`}
          >
            <Terminal size={11} className={hasConsoleError ? "text-[var(--danger)]" : undefined} />
            Console
            {hasConsoleError ? (
              <span className="ml-0.5 text-2xs px-1 rounded bg-[var(--danger-bg)] text-[var(--danger)]">
                error
              </span>
            ) : (
              <span className="ml-0.5 text-2xs px-1 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
                {consoleLogs.preRequest.length + consoleLogs.postResponse.length}
              </span>
            )}
          </button>
        )}
        {hasGraphQLTab && (
          <button
            onClick={() => set({ responseTab: "graphql-errors" })}
            className={`tab-btn flex items-center gap-1 ${responseTab === "graphql-errors" ? "active" : ""}`}
          >
            {hasGraphQLErrors ? (
              <AlertCircle size={11} className="text-[var(--danger)]" />
            ) : null}
            GraphQL
            {hasGraphQLErrors && (
              <span className="ml-0.5 text-2xs px-1 rounded bg-[var(--danger-bg)] text-[var(--danger)]">
                {graphqlErrors.length}
              </span>
            )}
          </button>
        )}
        {graphqlDeferredParts && graphqlDeferredParts.length > 0 && (
          <button
            onClick={() => set({ responseTab: "graphql-deferred" })}
            className={`tab-btn flex items-center gap-1 ${responseTab === "graphql-deferred" ? "active" : ""}`}
          >
            Deferred
            <span className="ml-0.5 text-2xs px-1 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
              {graphqlDeferredParts.filter((p) => p.partIndex > 0).length}
            </span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {responseTab === "body" && (
          <div className="flex flex-col h-full">
            {jsonPathResult !== null && (
              <div
                className={`px-3 py-1.5 border-b border-[var(--border)] text-2xs font-mono ${jsonPathResult.startsWith("Error:") ? "text-[var(--danger)] bg-[var(--danger-bg)]" : "text-[var(--text-1)] bg-[var(--surface-2)]"}`}
              >
                {jsonPathResult}
              </div>
            )}
            {response?.error?.startsWith("BODY_TRUNCATED:") && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--warn-bg)] border-b border-[var(--warn)] text-[var(--warn)] text-2xs">
                <AlertTriangle size={12} className="shrink-0" />
                <span>Response body truncated at 50 MB</span>
              </div>
            )}
            <div className="flex-1 overflow-auto">
              <CodeEditor value={displayBody} lang={lang} readOnly />
            </div>
          </div>
        )}
        {responseTab === "headers" && (
          <HeadersTab
            onQuickAssert={(draft) => setOverlay({ kind: "assertion", draft })}
            onQuickExtract={(draft) =>
              setOverlay({ kind: "extraction", draft })
            }
          />
        )}
        {responseTab === "timing" && <TimingTab />}
        {responseTab === "tls" && <TLSTab />}
        {responseTab === "assertions" && (
          <AssertionsTab
            assertionRules={assertionRules}
            assertionResults={assertionResults}
          />
        )}
        {responseTab === "auth" && <AuthDebugTab />}
        {responseTab === "code" && <CodeTab />}
        {responseTab === "visualize" && <VisualizeTab />}
        {responseTab === "console" && <ConsoleTab />}
        {responseTab === "graphql-errors" && <GraphQLErrorsTab />}
        {responseTab === "graphql-deferred" && <DeferredTab />}
      </div>

      {overlay?.kind === "assertion" && (
        <QuickAssertionOverlay
          draft={overlay.draft}
          onConfirm={addAssertion}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "extraction" && (
        <QuickExtractionOverlay
          draft={overlay.draft}
          onConfirm={addExtraction}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === "saveExample" && (
        <SaveExampleOverlay
          exampleName={exampleName}
          placeholder={`Example ${responseExamples.length + 1}`}
          onChange={setExampleName}
          onSave={saveExample}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  );
}
