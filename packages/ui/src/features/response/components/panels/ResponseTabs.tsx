import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Code2,
  Eye,
  KeyRound,
  List,
  Shield,
  Terminal,
} from "lucide-react";
import type { ResponseTab } from "../../../../types";

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
          onClick={() => onSelect("console")}
          className={`tab-btn flex items-center gap-1 ${responseTab === "console" ? "active" : ""}`}
        >
          <Terminal
            size={11}
            className={hasConsoleError ? "text-[var(--danger)]" : undefined}
          />
          Console
          <span
            className={`ml-0.5 text-2xs px-1 rounded ${hasConsoleError ? "bg-[var(--danger-bg)] text-[var(--danger)]" : "bg-[var(--accent-subtle)] text-[var(--accent)]"}`}
          >
            {hasConsoleError ? "error" : consoleCount}
          </span>
        </button>
      )}
      {hasGraphQLTab && (
        <button
          onClick={() => onSelect("graphql-errors")}
          className={`tab-btn flex items-center gap-1 ${responseTab === "graphql-errors" ? "active" : ""}`}
        >
          {hasGraphQLErrors && (
            <AlertCircle size={11} className="text-[var(--danger)]" />
          )}
          GraphQL
          {hasGraphQLErrors && (
            <span className="ml-0.5 text-2xs px-1 rounded bg-[var(--danger-bg)] text-[var(--danger)]">
              {graphqlErrorCount}
            </span>
          )}
        </button>
      )}
      {deferredCount > 0 && (
        <button
          onClick={() => onSelect("graphql-deferred")}
          className={`tab-btn flex items-center gap-1 ${responseTab === "graphql-deferred" ? "active" : ""}`}
        >
          Deferred
          <span className="ml-0.5 text-2xs px-1 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
            {deferredCount}
          </span>
        </button>
      )}
    </div>
  );
}
