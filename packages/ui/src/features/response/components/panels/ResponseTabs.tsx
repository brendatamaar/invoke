import type { ResponseTab } from "../../../../types";

const STATIC_TABS: { id: ResponseTab; label: string }[] = [
  { id: "body", label: "Body" },
  { id: "headers", label: "Headers" },
  { id: "timing", label: "Timing" },
  { id: "tls", label: "TLS" },
  { id: "assertions", label: "Assertions" },
  { id: "auth", label: "Auth" },
  { id: "code", label: "Code" },
  { id: "visualize", label: "Visualize" },
];

export function ResponseTabs({
  responseTab,
  passedCount,
  totalCount,
  hasConsoleLogs,
  hasConsoleError,
  consoleCount,
  hasGraphQLTab,
  hasGraphQLErrors,
  graphqlErrorCount,
  deferredCount,
  onSelect,
}: {
  responseTab: ResponseTab;
  passedCount: number;
  totalCount: number;
  hasConsoleLogs: boolean;
  hasConsoleError: boolean;
  consoleCount: number;
  hasGraphQLTab: boolean;
  hasGraphQLErrors: boolean;
  graphqlErrorCount: number;
  deferredCount: number;
  onSelect: (tab: ResponseTab) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)]">
      {STATIC_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`tab-btn text-2xs ${responseTab === tab.id ? "active" : ""}`}
        >
          {tab.label}
          {tab.id === "assertions" && totalCount > 0 && (
            <span
              className={`ml-1 px-1 rounded ${passedCount === totalCount ? "bg-[var(--ok-bg)] text-[var(--ok)]" : "bg-[var(--danger-bg)] text-[var(--danger)]"}`}
            >
              {passedCount}/{totalCount}
            </span>
          )}
        </button>
      ))}
      {hasConsoleLogs && (
        <button
          onClick={() => onSelect("console")}
          className={`tab-btn text-2xs ${responseTab === "console" ? "active" : ""}`}
        >
          Console
          <span
            className={`ml-1 px-1 rounded ${hasConsoleError ? "bg-[var(--danger-bg)] text-[var(--danger)]" : "bg-[var(--accent-subtle)] text-[var(--accent)]"}`}
          >
            {hasConsoleError ? "err" : consoleCount}
          </span>
        </button>
      )}
      {hasGraphQLTab && (
        <button
          onClick={() => onSelect("graphql-errors")}
          className={`tab-btn text-2xs ${responseTab === "graphql-errors" ? "active" : ""}`}
        >
          GraphQL
          {hasGraphQLErrors && (
            <span className="ml-1 px-1 rounded bg-[var(--danger-bg)] text-[var(--danger)]">
              {graphqlErrorCount}
            </span>
          )}
        </button>
      )}
      {deferredCount > 0 && (
        <button
          onClick={() => onSelect("graphql-deferred")}
          className={`tab-btn text-2xs ${responseTab === "graphql-deferred" ? "active" : ""}`}
        >
          Deferred
          <span className="ml-1 px-1 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
            {deferredCount}
          </span>
        </button>
      )}
    </div>
  );
}
