import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { CODE_EXPORT_TARGETS } from "@invoke/core";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { Select } from "../../../components/shared/Select";
import { useStore } from "../../../store";

export function CodeTab() {
  const { codeTarget, codeSnippet, codeLoading, request, set } = useStore();
  const [copied, setCopied] = useState(false);

  const isGraphQL = request.protocol === "graphql";

  const visibleTargets = CODE_EXPORT_TARGETS.filter((t) =>
    isGraphQL
      ? true
      : !t.target.startsWith("graphql-"),
  );

  const copy = () => {
    navigator.clipboard.writeText(codeSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <Select
          size="2xs"
          value={codeTarget}
          onChange={(e) =>
            set({ codeTarget: e.target.value as typeof codeTarget })
          }
          wrapperClassName="w-44"
        >
          {visibleTargets.map((t) => (
            <option key={t.target} value={t.target}>
              {t.label}
            </option>
          ))}
        </Select>
        {codeLoading && (
          <span className="text-2xs text-[var(--text-3)]">Generating...</span>
        )}
        <button
          onClick={copy}
          disabled={!codeSnippet}
          className="ml-auto p-1 text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-40"
          title="Copy to clipboard"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <CodeEditor
          value={codeSnippet}
          lang={codeTarget === "curl" ? "text" : "text"}
          readOnly
        />
      </div>
    </div>
  );
}
