import type { Assertion, AssertionResult } from "@invoke/core";

export function AssertionsTab({
  assertionRules,
  assertionResults,
}: {
  assertionRules: Assertion[];
  assertionResults: AssertionResult[];
}) {
  if (!assertionResults.length)
    return <p className="p-4 text-xs text-[var(--text-3)]">No assertions configured</p>;
  return (
    <div className="divide-y divide-[var(--border)]">
      {assertionResults.map((result, i) => {
        const rule = assertionRules[i];
        return (
          <div
            key={i}
            className={`flex items-start gap-3 px-3 py-3 ${result.passed ? "" : "bg-[var(--danger-bg)]"}`}
          >
            <span
              className={`mt-0.5 text-2xs font-bold shrink-0 px-1.5 py-0.5 rounded ${result.passed ? "bg-[var(--ok-bg)] text-[var(--ok)]" : "bg-[var(--danger-bg)] text-[var(--danger)]"}`}
            >
              {result.passed ? "OK" : "ERR"}
            </span>
            <div className="flex-1 min-w-0">
              {rule ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <code className="px-1 py-0.5 rounded bg-[var(--surface-2)] text-2xs font-mono text-[var(--text-2)]">
                    {rule.type}
                  </code>
                  <span className="text-2xs text-[var(--text-3)]">{rule.matcher}</span>
                  <code className="px-1 py-0.5 rounded bg-[var(--surface-2)] text-2xs font-mono text-[var(--text-1)]">
                    {rule.expected}
                  </code>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-1)]">Assertion {i + 1}</p>
              )}
              {!result.passed && result.actual !== undefined && (
                <p className="text-2xs font-mono text-[var(--text-3)] mt-1.5">
                  got: <span className="text-[var(--danger)]">{String(result.actual)}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
