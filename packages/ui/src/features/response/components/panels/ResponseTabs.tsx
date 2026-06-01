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
  consoleLogs,
  graphql,
  onSelect,
}: {
  responseTab: ResponseTab;
  passedCount: number;
  totalCount: number;
  consoleLogs?: { count: number; hasError: boolean };
  graphql?: { hasErrors: boolean; errorCount: number; deferredCount: number; hasDeferred: boolean };
  onSelect: (tab: ResponseTab) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)]">
      {STATIC_TABS.map((tab) => (
        <button
          type="button"
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
      {consoleLogs && (
        <button
          type="button"
          onClick={() => onSelect("console")}
          className={`tab-btn text-2xs ${responseTab === "console" ? "active" : ""}`}
        >
          Console
          <span
            className={`ml-1 px-1 rounded ${consoleLogs.hasError ? "bg-[var(--danger-bg)] text-[var(--danger)]" : "bg-[var(--accent-subtle)] text-[var(--accent)]"}`}
          >
            {consoleLogs.hasError ? "err" : consoleLogs.count}
          </span>
        </button>
      )}
      {graphql && (
        <button
          type="button"
          onClick={() => onSelect("graphql-errors")}
          className={`tab-btn text-2xs ${responseTab === "graphql-errors" ? "active" : ""}`}
        >
          GraphQL
          {graphql.hasErrors && (
            <span className="ml-1 px-1 rounded bg-[var(--danger-bg)] text-[var(--danger)]">
              {graphql.errorCount}
            </span>
          )}
          {!graphql.hasErrors && graphql.hasDeferred && (
            <span className="ml-1 px-1 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
              {graphql.deferredCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
