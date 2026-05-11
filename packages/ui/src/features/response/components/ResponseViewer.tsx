import { useState } from "react";
import type { ReactNode } from "react";
import { useStore, coreStore } from "../../../store";
import { StatusBadge } from "../../../components/shared/StatusBadge";
import type { AssertionDraft, ExtractionDraft, ResponseTab } from "../../../types";
import {
  AlertCircle,
  Clock,
  HardDrive,
  Shield,
  CheckCircle,
  Code2,
  Eye,
  GitCompare,
  List,
  PlusCircle,
  BookmarkPlus,
  Cpu,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { AssertionsTab } from "./AssertionsTab";
import { AuthDebugTab } from "./AuthDebugTab";
import { BodyTab } from "./BodyTab";
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
import { GraphQLErrorsTab, parseGraphQLErrors, parseGraphQLCost } from "./GraphQLErrorsTab";
import { DeferredTab } from "./DeferredTab";

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
  } = useStore();

  const isGraphQL = request.protocol === "graphql";
  const graphqlErrors = response ? parseGraphQLErrors(response.body) : [];
  const hasGraphQLErrors = graphqlErrors.length > 0;
  const { cost: gqlCost, complexity: gqlComplexity } = response ? parseGraphQLCost(response.body) : { cost: null, complexity: null };
  const hasGraphQLTab = isGraphQL && (hasGraphQLErrors || gqlCost !== null || gqlComplexity !== null);

  const [overlay, setOverlay] = useState<
    | { kind: "assertion"; draft: AssertionDraft }
    | { kind: "extraction"; draft: ExtractionDraft }
    | { kind: "saveExample" }
    | null
  >(null);
  const [exampleName, setExampleName] = useState("");

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
        <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-2">
          <Code2 size={18} className="text-red-400" />
        </div>
        <p className="text-sm text-[var(--text-2)] font-medium">
          Request failed
        </p>
        {response.error && (
          <p className="text-xs text-red-500 font-mono max-w-md break-all">
            {response.error}
          </p>
        )}
      </div>
    );
  }

  const passedCount = assertionResults.filter((r) => r.passed).length;
  const totalCount = assertionResults.length;

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
          <StatusBadge status={response.status} />
          <button
            onClick={() =>
              setOverlay({
                kind: "assertion",
                draft: {
                  type: "status",
                  expression: "",
                  matcher: "equals",
                  expected: String(response.status),
                },
              })
            }
            className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
            title="Create assertion from status"
          >
            <PlusCircle size={11} />
          </button>
          <span className="ml-auto text-2xs text-[var(--text-3)] flex items-center gap-1">
            <Clock size={11} /> {fmt(response.timing?.totalMs ?? 0)}
          </span>
          <span className="text-2xs text-[var(--text-3)] flex items-center gap-1">
            <HardDrive size={11} /> {fmtSize(response.responseSize ?? 0)}
          </span>
          {response.statusText && response.status !== 0 && (
            <span className="text-2xs text-[var(--text-3)] font-mono">
              {response.statusText}
            </span>
          )}
          {(retryAttempts ?? 0) > 0 && (
            <span className="text-2xs text-amber-600 flex items-center gap-1">
              <RefreshCw size={11} /> {retryAttempts} retr{retryAttempts === 1 ? "y" : "ies"}
            </span>
          )}
          {gqlComplexity !== null && (
            <span className="text-2xs text-amber-600 flex items-center gap-1" title="Query complexity">
              ⚡ {gqlComplexity}
            </span>
          )}
          {gqlCost !== null && typeof gqlCost === "number" && (
            <span className="text-2xs text-amber-600 flex items-center gap-1" title="Query cost">
              ⚡ {gqlCost}
            </span>
          )}
          {gqlCost !== null && typeof gqlCost === "object" && gqlCost.requestedQueryCost != null && (
            <span className="text-2xs text-amber-600 flex items-center gap-1" title={`Max: ${gqlCost.maximumAvailable ?? "?"}`}>
              ⚡ {gqlCost.requestedQueryCost}/{gqlCost.maximumAvailable ?? "?"}
            </span>
          )}
          {totalCount > 0 && (
            <span
              className={`text-2xs flex items-center gap-1 ${passedCount === totalCount ? "text-emerald-600" : "text-red-600"}`}
            >
              <CheckCircle size={11} /> {passedCount}/{totalCount}
            </span>
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
                set({ diffLeftId: previous.id, diffRightId: latest.id, showDiffModal: true });
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
                className={`ml-0.5 text-2xs px-1 rounded ${passedCount === totalCount ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
              >
                {passedCount}/{totalCount}
              </span>
            )}
          </button>
        ))}
        {hasGraphQLTab && (
          <button
            onClick={() => set({ responseTab: "graphql-errors" })}
            className={`tab-btn flex items-center gap-1 ${responseTab === "graphql-errors" ? "active" : ""}`}
          >
            {hasGraphQLErrors ? <AlertCircle size={11} className="text-red-500" /> : null}
            GraphQL
            {hasGraphQLErrors && (
              <span className="ml-0.5 text-2xs px-1 rounded bg-red-100 text-red-700">
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
          <BodyTab
            onQuickAssert={(draft) => setOverlay({ kind: "assertion", draft })}
            onQuickExtract={(draft) =>
              setOverlay({ kind: "extraction", draft })
            }
          />
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
