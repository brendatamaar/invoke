import type { RequestDraft, RetryPolicy } from "@invoke/core";
import { Select } from "../../../components/shared/Select";
import { useStore } from "../../../store";
import type { FieldProps } from "../../../types";

const EXPR_PLACEHOLDER: Partial<Record<string, string>> = {
  header: "Header-Name",
  bodyJsonPath: "$.path.to.value",
  regex: "regex pattern",
};

function Field({ label, children }: FieldProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--text-2)] w-24 shrink-0">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

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

  const needsExpr = (type: string) =>
    type === "header" || type === "bodyJsonPath" || type === "regex";

  return (
    <div className="p-3 flex flex-col gap-2">
      {assertionRules.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <span className="w-28 shrink-0 text-2xs text-[var(--text-3)]">
            Type
          </span>
          <span className="w-48 shrink-0 text-2xs text-[var(--text-3)]">
            Path / Key
          </span>
          <span className="w-28 shrink-0 text-2xs text-[var(--text-3)]">
            Matcher
          </span>
          <span className="flex-1 text-2xs text-[var(--text-3)]">Expected</span>
        </div>
      )}
      {assertionRules.map((rule, index) => {
        const result = assertionResults[index];
        const exprNeeded = needsExpr(rule.type);
        return (
          <div
            key={index}
            className={`flex items-center gap-2 p-2 rounded border ${result ? (result.passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50") : "border-[var(--border)]"}`}
          >
            <div className="w-28 shrink-0">
              <Select
                size="2xs"
                value={rule.type}
                onChange={(e) => update(index, { type: e.target.value })}
              >
                {[
                  "status",
                  "responseTime",
                  "header",
                  "bodyJsonPath",
                  "bodySchema",
                  "regex",
                ].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-48 shrink-0">
              {exprNeeded ? (
                <input
                  value={(rule as { expression?: string }).expression ?? ""}
                  onChange={(e) =>
                    update(index, { expression: e.target.value })
                  }
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
                {[
                  "equals",
                  "notEquals",
                  "contains",
                  "exists",
                  "gt",
                  "lt",
                  "matches",
                ].map((matcher) => (
                  <option key={matcher} value={matcher}>
                    {matcher}
                  </option>
                ))}
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
        );
      })}
      <button onClick={add} className="btn text-xs self-start">
        + Add assertion
      </button>
    </div>
  );
}

export function ExtractPanel() {
  const { extractRules, set } = useStore();
  const add = () =>
    set((state) => ({
      extractRules: [
        ...state.extractRules,
        { variableName: "", source: "body" as const, expression: "" },
      ],
    }));
  const remove = (index: number) =>
    set((state) => ({
      extractRules: state.extractRules.filter((_, idx) => idx !== index),
    }));
  const update = (index: number, patch: object) =>
    set((state) => ({
      extractRules: state.extractRules.map((rule, idx) =>
        idx === index ? { ...rule, ...patch } : rule,
      ),
    }));

  return (
    <div className="p-3 flex flex-col gap-2">
      {extractRules.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <span className="w-32 shrink-0 text-2xs text-[var(--text-3)]">
            Variable
          </span>
          <span className="w-24 shrink-0 text-2xs text-[var(--text-3)]">
            Source
          </span>
          <span className="flex-1 text-2xs text-[var(--text-3)]">
            Expression
          </span>
        </div>
      )}
      {extractRules.map((rule, index) => {
        const source = rule.source ?? "body";
        const exprPlaceholder =
          source === "header" ? "Header-Name" : "$.path.to.value";
        return (
          <div
            key={index}
            className="flex items-center gap-2 border border-[var(--border)] rounded p-2"
          >
            <div className="w-32 shrink-0">
              <input
                value={rule.variableName ?? ""}
                onChange={(e) =>
                  update(index, { variableName: e.target.value })
                }
                placeholder="variableName"
                className="input py-0.5 text-2xs font-mono"
              />
            </div>
            <div className="w-24 shrink-0">
              <Select
                size="2xs"
                value={source}
                onChange={(e) => update(index, { source: e.target.value })}
              >
                {["body", "header", "status"].map((sourceOption) => (
                  <option key={sourceOption} value={sourceOption}>
                    {sourceOption}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              {source !== "status" ? (
                <input
                  value={rule.expression ?? ""}
                  onChange={(e) =>
                    update(index, { expression: e.target.value })
                  }
                  placeholder={exprPlaceholder}
                  className="input py-0.5 text-2xs font-mono"
                />
              ) : (
                <span className="text-2xs text-[var(--text-3)] px-2">
                  no expression needed
                </span>
              )}
            </div>
            <button
              onClick={() => remove(index)}
              className="shrink-0 text-[var(--text-3)] hover:text-[var(--danger)]"
            >
              x
            </button>
          </div>
        );
      })}
      <button onClick={add} className="btn text-xs self-start">
        + Add rule
      </button>
    </div>
  );
}

export function RetryPanel() {
  const { request, setRequest } = useStore();
  const policy = (request as { retryPolicy?: RetryPolicy }).retryPolicy ?? {
    maxRetries: 0,
    retryOnTimeout: true,
    retryOn5xx: true,
    backoffMs: 500,
  };

  const update = (patch: Partial<RetryPolicy>) =>
    setRequest({
      retryPolicy: { ...policy, ...patch },
    } as Partial<RequestDraft>);

  const enabled = policy.maxRetries > 0;

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="retry-enable"
          checked={enabled}
          onChange={(e) => update({ maxRetries: e.target.checked ? 3 : 0 })}
          className="accent-[var(--accent)]"
        />
        <label
          htmlFor="retry-enable"
          className="text-xs text-[var(--text-2)] cursor-pointer"
        >
          Enable retry
        </label>
      </div>
      {enabled && (
        <>
          <Field label="Max retries">
            <input
              type="number"
              min={1}
              max={10}
              value={policy.maxRetries}
              onChange={(e) =>
                update({ maxRetries: Math.max(1, Number(e.target.value)) })
              }
              className="input text-xs py-1 w-20"
            />
          </Field>
          <Field label="Backoff (ms)">
            <input
              type="number"
              min={0}
              step={100}
              value={policy.backoffMs}
              onChange={(e) =>
                update({ backoffMs: Math.max(0, Number(e.target.value)) })
              }
              className="input text-xs py-1 w-24"
            />
          </Field>
          <Field label="Retry on">
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.retryOn5xx}
                  onChange={(e) => update({ retryOn5xx: e.target.checked })}
                  className="accent-[var(--accent)]"
                />
                5xx errors
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-2)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.retryOnTimeout}
                  onChange={(e) => update({ retryOnTimeout: e.target.checked })}
                  className="accent-[var(--accent)]"
                />
                Timeout
              </label>
            </div>
          </Field>
          <p className="text-2xs text-[var(--text-3)]">
            Backoff doubles each retry. Total wait approx{" "}
            {Array.from(
              { length: policy.maxRetries },
              (_, index) => policy.backoffMs * Math.pow(2, index),
            ).reduce((a, b) => a + b, 0)}
            ms max.
          </p>
        </>
      )}
    </div>
  );
}
