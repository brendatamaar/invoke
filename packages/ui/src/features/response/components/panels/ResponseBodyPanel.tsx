import { AlertTriangle } from "lucide-react";
import { CodeEditor } from "../../../../components/editors/CodeEditor";
import type { CodeEditorLang } from "../../../../types";

export function ResponseBodyPanel({
  jsonPathResult,
  truncated,
  displayBody,
  lang,
}: {
  jsonPathResult: string | null;
  truncated: boolean;
  displayBody: string;
  lang: CodeEditorLang;
}) {
  return (
    <div className="flex flex-col h-full">
      {jsonPathResult !== null && (
        <div
          className={`px-3 py-1.5 border-b border-[var(--border)] text-2xs font-mono ${jsonPathResult.startsWith("Error:") ? "text-[var(--danger)] bg-[var(--danger-bg)]" : "text-[var(--text-1)] bg-[var(--surface-2)]"}`}
        >
          {jsonPathResult}
        </div>
      )}
      {truncated && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--warn-bg)] border-b border-[var(--warn)] text-[var(--warn)] text-2xs">
          <AlertTriangle size={12} className="shrink-0" />
          <span>Response body truncated at 50 MB</span>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <CodeEditor value={displayBody} lang={lang} readOnly />
      </div>
    </div>
  );
}
