import { useState } from "react";
import type {
  AssertionMatcher,
  AssertionType,
  ExtractionSource,
} from "@invoke/core";
import { Select } from "../../../components/shared/Select";
import type { AssertionDraft, ExtractionDraft } from "../../../types";

export function QuickAssertionOverlay({
  draft,
  onConfirm,
  onClose,
}: {
  draft: AssertionDraft;
  onConfirm: (d: AssertionDraft) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(draft);
  const needsExpr =
    d.type === "header" || d.type === "bodyJsonPath" || d.type === "regex";

  return (
    <div className="absolute z-20 right-3 top-12 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl p-3 flex flex-col gap-2 w-72">
      <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">
        Quick assertion
      </span>
      <div className="flex gap-1.5">
        <Select
          size="2xs"
          value={d.type}
          onChange={(e) =>
            setD((x) => ({ ...x, type: e.target.value as AssertionType }))
          }
        >
          {[
            "status",
            "responseTime",
            "header",
            "bodyJsonPath",
            "bodySchema",
            "regex",
          ].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          size="2xs"
          value={d.matcher}
          onChange={(e) =>
            setD((x) => ({ ...x, matcher: e.target.value as AssertionMatcher }))
          }
        >
          {[
            "equals",
            "notEquals",
            "contains",
            "exists",
            "gt",
            "lt",
            "matches",
          ].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </div>
      {needsExpr && (
        <input
          value={d.expression}
          onChange={(e) => setD((x) => ({ ...x, expression: e.target.value }))}
          placeholder={d.type === "header" ? "Header-Name" : "$.path"}
          className="input text-2xs py-0.5 font-mono"
        />
      )}
      <input
        value={d.expected}
        onChange={(e) => setD((x) => ({ ...x, expected: e.target.value }))}
        placeholder="expected"
        className="input text-2xs py-0.5 font-mono"
      />
      <div className="flex gap-1.5 justify-end">
        <button onClick={onClose} className="btn text-2xs py-0.5 px-2">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(d)}
          className="btn btn-primary text-2xs py-0.5 px-2"
        >
          Add assertion
        </button>
      </div>
    </div>
  );
}

export function QuickExtractionOverlay({
  draft,
  onConfirm,
  onClose,
}: {
  draft: ExtractionDraft;
  onConfirm: (d: ExtractionDraft) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(draft);
  const needsExpr = d.source !== "status";

  return (
    <div className="absolute z-20 right-3 top-12 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl p-3 flex flex-col gap-2 w-72">
      <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">
        Quick extraction
      </span>
      <input
        value={d.variableName}
        onChange={(e) => setD((x) => ({ ...x, variableName: e.target.value }))}
        placeholder="variableName"
        className="input text-2xs py-0.5 font-mono"
      />
      <div className="flex gap-1.5">
        <Select
          size="2xs"
          value={d.source}
          onChange={(e) =>
            setD((x) => ({ ...x, source: e.target.value as ExtractionSource }))
          }
        >
          {["body", "header", "status"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        {needsExpr && (
          <input
            value={d.expression}
            onChange={(e) =>
              setD((x) => ({ ...x, expression: e.target.value }))
            }
            placeholder={d.source === "header" ? "Header-Name" : "$.path"}
            className="input text-2xs py-0.5 font-mono flex-1"
          />
        )}
      </div>
      <div className="flex gap-1.5 justify-end">
        <button onClick={onClose} className="btn text-2xs py-0.5 px-2">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(d)}
          className="btn btn-primary text-2xs py-0.5 px-2"
        >
          Add rule
        </button>
      </div>
    </div>
  );
}

export function SaveExampleOverlay({
  exampleName,
  placeholder,
  onChange,
  onSave,
  onClose,
}: {
  exampleName: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute z-20 right-3 top-12 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl p-3 flex flex-col gap-2 w-60">
      <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">
        Save as example
      </span>
      <input
        autoFocus
        value={exampleName}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onClose();
        }}
        placeholder={placeholder}
        className="input text-xs py-1"
      />
      <div className="flex gap-1.5 justify-end">
        <button onClick={onClose} className="btn text-2xs py-0.5 px-2">
          Cancel
        </button>
        <button onClick={onSave} className="btn btn-primary text-2xs py-0.5 px-2">
          Save
        </button>
      </div>
    </div>
  );
}
