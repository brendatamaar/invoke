import type { Assertion, AssertionResult } from "@invoke/core";

export function AssertionsTab({
  assertionRules,
  assertionResults,
}: {
  assertionRules: Assertion[];
  assertionResults: AssertionResult[];
}) {
  if (!assertionResults.length)
    return (
      <p className="p-4 text-xs text-[var(--text-3)]">
        No assertions configured
      </p>
    );
  return (
    <div className="divide-y divide-[var(--border)]">
      {assertionResults.map((result, i) => {
        const rule = assertionRules[i];
        return (
          <div
            key={i}
            className={`flex items-start gap-3 px-3 py-2.5 ${result.passed ? "" : "bg-[var(--danger-bg)]"}`}
          >
            <span
              className={`mt-0.5 text-sm ${result.passed ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
            >
              {result.passed ? "OK" : "ERR"}
            </span>
            <div className="flex-1">
              <p className="text-xs text-[var(--text-1)]">
                {rule
                  ? `${rule.type} ${rule.matcher} ${rule.expected}`
                  : `Assertion ${i + 1}`}
              </p>
              {!result.passed && (
                <p className="text-2xs text-[var(--text-3)] font-mono mt-0.5">
                  got: {String(result.actual)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
