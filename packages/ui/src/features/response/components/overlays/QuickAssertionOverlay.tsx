import { useState } from "react";
import type { AssertionMatcher, AssertionType } from "@invoke/core";
import { Select } from "../../../../components/shared/Select";
import type { AssertionDraft } from "../../../../types";

export function QuickAssertionOverlay({
  draft,
  onConfirm,
  onClose,
}: {
  draft: AssertionDraft;
  onConfirm: (draft: AssertionDraft) => void;
  onClose: () => void;
}) {
  const [edits, setEdits] = useState<Partial<AssertionDraft>>({});
  const current = { ...draft, ...edits };
  const needsExpression =
    current.type === "header" || current.type === "bodyJsonPath" || current.type === "regex";

  return (
    <div className="absolute z-20 right-3 top-12 bg-[var(--bg-2)] border border-[var(--line-2)] rounded-md shadow-[var(--shadow-2)] p-3 flex flex-col gap-2 w-72">
      <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">Quick assertion</span>
      <div className="flex gap-1.5">
        <Select
          size="2xs"
          value={current.type}
          onChange={(event) =>
            setEdits((prev) => ({
              ...prev,
              type: event.target.value as AssertionType,
            }))
          }
        >
          {["status", "responseTime", "header", "bodyJsonPath", "bodySchema", "regex"].map(
            (type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ),
          )}
        </Select>
        <Select
          size="2xs"
          value={current.matcher}
          onChange={(event) =>
            setEdits((prev) => ({
              ...prev,
              matcher: event.target.value as AssertionMatcher,
            }))
          }
        >
          {["equals", "notEquals", "contains", "exists", "gt", "lt", "matches"].map((matcher) => (
            <option key={matcher} value={matcher}>
              {matcher}
            </option>
          ))}
        </Select>
      </div>
      {needsExpression && (
        <input
          aria-label="Assertion expression"
          value={current.expression}
          onChange={(event) =>
            setEdits((prev) => ({ ...prev, expression: event.target.value }))
          }
          placeholder={current.type === "header" ? "Header-Name" : "$.path"}
          className="input text-2xs py-0.5 font-mono"
        />
      )}
      <input
        aria-label="Expected value"
        value={current.expected}
        onChange={(event) => setEdits((prev) => ({ ...prev, expected: event.target.value }))}
        placeholder="expected"
        className="input text-2xs py-0.5 font-mono"
      />
      <div className="flex gap-1.5 justify-end">
        <button type="button" onClick={onClose} className="btn text-2xs py-0.5 px-2">
          Cancel
        </button>
        <button type="button" onClick={() => onConfirm(current)} className="btn btn-primary text-2xs py-0.5 px-2">
          Add assertion
        </button>
      </div>
    </div>
  );
}
