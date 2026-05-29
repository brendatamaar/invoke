import { useState } from "react";
import type { ExtractionSource } from "@invoke/core";
import { Select } from "../../../../components/shared/Select";
import type { ExtractionDraft } from "../../../../types";

export function QuickExtractionOverlay({
  draft,
  onConfirm,
  onClose,
}: {
  draft: ExtractionDraft;
  onConfirm: (draft: ExtractionDraft) => void;
  onClose: () => void;
}) {
  const [edits, setEdits] = useState<Partial<ExtractionDraft>>({});
  const current = { ...draft, ...edits };
  const needsExpression = current.source !== "status";

  return (
    <div className="absolute z-20 right-3 top-12 bg-[var(--bg-2)] border border-[var(--line-2)] rounded-md shadow-[var(--shadow-2)] p-3 flex flex-col gap-2 w-72">
      <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">
        Quick extraction
      </span>
      <input
        aria-label="Variable name"
        value={current.variableName}
        onChange={(event) =>
          setEdits((prev) => ({
            ...prev,
            variableName: event.target.value,
          }))
        }
        placeholder="variableName"
        className="input text-2xs py-0.5 font-mono"
      />
      <div className="flex gap-1.5">
        <Select
          size="2xs"
          value={current.source}
          onChange={(event) =>
            setEdits((prev) => ({
              ...prev,
              source: event.target.value as ExtractionSource,
            }))
          }
        >
          {["body", "header", "status"].map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </Select>
        {needsExpression && (
          <input
            aria-label="Extraction expression"
            value={current.expression}
            onChange={(event) =>
              setEdits((prev) => ({
                ...prev,
                expression: event.target.value,
              }))
            }
            placeholder={current.source === "header" ? "Header-Name" : "$.path"}
            className="input text-2xs py-0.5 font-mono flex-1"
          />
        )}
      </div>
      <div className="flex gap-1.5 justify-end">
        <button type="button" onClick={onClose} className="btn text-2xs py-0.5 px-2">
          Cancel
        </button>
        <button type="button" onClick={() => onConfirm(current)} className="btn btn-primary text-2xs py-0.5 px-2">
          Add rule
        </button>
      </div>
    </div>
  );
}
