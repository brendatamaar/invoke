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
  const [current, setCurrent] = useState(draft);
  const needsExpression = current.source !== "status";

  return (
    <div className="absolute z-20 right-3 top-12 bg-[var(--bg-2)] border border-[var(--line-2)] rounded-md shadow-[var(--shadow-2)] p-3 flex flex-col gap-2 w-72">
      <span className="text-2xs font-semibold text-[var(--text-3)] uppercase">
        Quick extraction
      </span>
      <input
        value={current.variableName}
        onChange={(event) =>
          setCurrent((draft) => ({
            ...draft,
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
            setCurrent((draft) => ({
              ...draft,
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
            value={current.expression}
            onChange={(event) =>
              setCurrent((draft) => ({
                ...draft,
                expression: event.target.value,
              }))
            }
            placeholder={current.source === "header" ? "Header-Name" : "$.path"}
            className="input text-2xs py-0.5 font-mono flex-1"
          />
        )}
      </div>
      <div className="flex gap-1.5 justify-end">
        <button onClick={onClose} className="btn text-2xs py-0.5 px-2">
          Cancel
        </button>
        <button
          onClick={() => onConfirm(current)}
          className="btn btn-primary text-2xs py-0.5 px-2"
        >
          Add rule
        </button>
      </div>
    </div>
  );
}
