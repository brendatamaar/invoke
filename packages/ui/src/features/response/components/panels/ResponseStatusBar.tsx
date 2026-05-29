import {
  BookmarkPlus,
  CheckCircle,
  Clock,
  Cpu,
  GitCompare,
  HardDrive,
  Indent,
  PlusCircle,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { StatusBadge } from "../../../../components/shared/StatusBadge";
import type { AssertionDraft, ExtractionDraft } from "../../../../types";
import { fmt, fmtSize } from "../../responseFormatting";

export function ResponseStatusBar({
  response,
  responseTab,
  responsePretty,
  retryAttempts,
  gqlComplexity,
  gqlCost,
  passedCount,
  totalCount,
  isJson,
  jsonPathInput,
  canDiffHistory,
  onPretty,
  onJsonPathInput,
  onAssertion,
  onExtraction,
  onSaveExample,
  onCreateMock,
  onDiffHistory,
}: {
  response: any;
  responseTab: string;
  responsePretty: boolean;
  retryAttempts?: number;
  gqlComplexity: unknown;
  gqlCost: any;
  passedCount: number;
  totalCount: number;
  isJson: boolean;
  jsonPathInput: string;
  canDiffHistory: boolean;
  onPretty: () => void;
  onJsonPathInput: (value: string) => void;
  onAssertion: (draft: AssertionDraft) => void;
  onExtraction: (draft: ExtractionDraft) => void;
  onSaveExample: () => void;
  onCreateMock: () => void;
  onDiffHistory: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-2)]">
      <StatusBadge status={response.status} showLabel />
      <span className="ml-auto text-2xs text-[var(--text-3)] flex items-center gap-1">
        <Clock size={11} /> {fmt(response.timing?.totalMs ?? 0)}
      </span>
      <span className="text-2xs text-[var(--text-3)] flex items-center gap-1">
        <HardDrive size={11} /> {fmtSize(response.responseSize ?? 0)}
      </span>
      {(retryAttempts ?? 0) > 0 && (
        <span className="text-2xs text-[var(--warn)] flex items-center gap-1">
          <RefreshCw size={11} /> {retryAttempts} retr
          {retryAttempts === 1 ? "y" : "ies"}
        </span>
      )}
      {gqlComplexity !== null && (
        <span className="text-2xs text-[var(--warn)] flex items-center gap-1">
          {"\u26a1"} {String(gqlComplexity)}
        </span>
      )}
      <GraphQLCostBadge gqlCost={gqlCost} />
      {totalCount > 0 && (
        <span
          className={`text-2xs flex items-center gap-1 ${passedCount === totalCount ? "text-[var(--ok)]" : "text-[var(--danger)]"}`}
        >
          <CheckCircle size={11} /> {passedCount}/{totalCount}
        </span>
      )}
      {responseTab === "body" && isJson && (
        <JsonPathControls
          responsePretty={responsePretty}
          jsonPathInput={jsonPathInput}
          onPretty={onPretty}
          onJsonPathInput={onJsonPathInput}
          onAssertion={onAssertion}
          onExtraction={onExtraction}
        />
      )}
      <button
        type="button"
        onClick={onSaveExample}
        className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
        title="Save as response example"
      >
        <BookmarkPlus size={11} />
      </button>
      <button
        type="button"
        onClick={onCreateMock}
        className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
        title="Create mock route from this response"
      >
        <Cpu size={11} />
      </button>
      {canDiffHistory && (
        <button
          type="button"
          onClick={onDiffHistory}
          className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
          title="Diff last two history entries"
        >
          <GitCompare size={11} />
        </button>
      )}
    </div>
  );
}

function GraphQLCostBadge({ gqlCost }: { gqlCost: any }) {
  if (gqlCost === null) return null;
  if (typeof gqlCost === "number") {
    return (
      <span className="text-2xs text-[var(--warn)] flex items-center gap-1">
        {"\u26a1"} {gqlCost}
      </span>
    );
  }
  if (gqlCost.requestedQueryCost == null) return null;
  return (
    <span
      className="text-2xs text-[var(--warn)] flex items-center gap-1"
      title={`Max: ${gqlCost.maximumAvailable ?? "?"}`}
    >
      {"\u26a1"} {gqlCost.requestedQueryCost}/{gqlCost.maximumAvailable ?? "?"}
    </span>
  );
}

function JsonPathControls({
  responsePretty,
  jsonPathInput,
  onPretty,
  onJsonPathInput,
  onAssertion,
  onExtraction,
}: {
  responsePretty: boolean;
  jsonPathInput: string;
  onPretty: () => void;
  onJsonPathInput: (value: string) => void;
  onAssertion: (draft: AssertionDraft) => void;
  onExtraction: (draft: ExtractionDraft) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-l border-[var(--border)] pl-2 ml-1">
      <button
        type="button"
        onClick={onPretty}
        className={`p-0.5 ${responsePretty ? "text-[var(--accent)]" : "text-[var(--text-3)] hover:text-[var(--accent)]"}`}
        title="Pretty print"
      >
        <Indent size={11} />
      </button>
      <input
        aria-label="JSONPath expression"
        value={jsonPathInput}
        onChange={(e) => onJsonPathInput(e.target.value)}
        placeholder="$.path"
        className="input text-2xs py-0 px-1 w-28 font-mono"
        title="JSONPath playground - evaluate live"
      />
      <button
        type="button"
        onClick={() =>
          onAssertion({
            type: "bodyJsonPath",
            expression: jsonPathInput,
            matcher: "equals",
            expected: "",
          })
        }
        className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5 mr-2"
        title="Create assertion from JSONPath"
      >
        <PlusCircle size={11} />
      </button>
      <button
        type="button"
        onClick={() =>
          onExtraction({
            variableName:
              jsonPathInput
                .replace(/^\$\.?/, "")
                .replace(/[^a-zA-Z0-9_]/g, "_")
                .replace(/^_+|_+$/g, "") || "extracted",
            source: "body",
            expression: jsonPathInput,
          })
        }
        className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
        title="Create extraction from JSONPath"
      >
        <Wand2 size={11} />
      </button>
    </div>
  );
}
