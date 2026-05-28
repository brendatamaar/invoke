import { Select } from "../../../components/shared/Select";
import { useStore } from "../../../store";

const EXPR_PLACEHOLDER: Partial<Record<string, string>> = {
  header: "Header-Name",
  bodyJsonPath: "$.path.to.value",
  regex: "regex pattern",
};

export function AssertionsPanel() {
  const { assertionRules, assertionResults, set } = useStore();
  const add = () =>
    set((state) => ({
      assertionRules: [
        ...state.assertionRules,
        {
          id: Math.random().toString(36).slice(2),
          type: "status" as const,
          expression: "",
          matcher: "equals" as const,
          expected: "200",
          enabled: true,
        },
      ],
    }));
  const remove = (index: number) =>
    set((state) => ({
      assertionRules: state.assertionRules.filter((_, idx) => idx !== index),
    }));
  const update = (index: number, patch: object) =>
    set((state) => ({
      assertionRules: state.assertionRules.map((rule, idx) =>
        idx === index ? { ...rule, ...patch } : rule,
      ),
    }));

  return (
    <div className="p-3 flex flex-col gap-2">
      {assertionRules.length > 0 && <AssertionHeader />}
      {assertionRules.map((rule, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 p-2 rounded border ${resultClass(assertionResults[index])}`}
        >
          <div className="w-28 shrink-0">
            <Select
              size="2xs"
              value={rule.type}
              onChange={(e) => update(index, { type: e.target.value })}
            >
              {["status", "responseTime", "header", "bodyJsonPath", "bodySchema", "regex"].map(
                (type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ),
              )}
            </Select>
          </div>
          <div className="w-48 shrink-0">
            {needsExpression(rule.type) ? (
              <input
                value={(rule as { expression?: string }).expression ?? ""}
                onChange={(e) => update(index, { expression: e.target.value })}
                placeholder={EXPR_PLACEHOLDER[rule.type] ?? "value"}
                className="input py-0.5 text-2xs font-mono"
              />
            ) : (
              <span className="text-2xs text-[var(--text-3)] px-1">-</span>
            )}
          </div>
          <div className="w-28 shrink-0">
            <Select
              size="2xs"
              value={rule.matcher}
              onChange={(e) => update(index, { matcher: e.target.value })}
            >
              {["equals", "notEquals", "contains", "exists", "gt", "lt", "matches"].map(
                (matcher) => (
                  <option key={matcher} value={matcher}>
                    {matcher}
                  </option>
                ),
              )}
            </Select>
          </div>
          <div className="flex-1 min-w-0">
            <input
              value={String(rule.expected ?? "")}
              onChange={(e) => update(index, { expected: e.target.value })}
              placeholder="expected value"
              className="input py-0.5 text-2xs font-mono"
            />
          </div>
          <button
            onClick={() => remove(index)}
            className="shrink-0 text-[var(--text-3)] hover:text-[var(--danger)]"
          >
            x
          </button>
        </div>
      ))}
      <button onClick={add} className="btn text-xs self-start">
        + Add assertion
      </button>
    </div>
  );
}

function AssertionHeader() {
  return (
    <div className="flex items-center gap-2 px-2">
      <span className="w-28 shrink-0 text-2xs text-[var(--text-3)]">Type</span>
      <span className="w-48 shrink-0 text-2xs text-[var(--text-3)]">Path / Key</span>
      <span className="w-28 shrink-0 text-2xs text-[var(--text-3)]">Matcher</span>
      <span className="flex-1 text-2xs text-[var(--text-3)]">Expected</span>
    </div>
  );
}

function needsExpression(type: string) {
  return type === "header" || type === "bodyJsonPath" || type === "regex";
}

function resultClass(result?: { passed: boolean }) {
  if (!result) return "border-[var(--border)]";
  return result.passed
    ? "border-[var(--ok)] bg-[var(--ok-bg)]"
    : "border-[var(--danger)] bg-[var(--danger-bg)]";
}
