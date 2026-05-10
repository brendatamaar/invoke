import { CodeEditor } from "../../../components/editors/CodeEditor";
import { Select } from "../../../components/shared/Select";
import { useStore } from "../../../store";

const CODE_TARGETS = [
  "curl",
  "fetch",
  "node-fetch",
  "node-axios",
  "python-requests",
  "python-httpx",
  "go-net-http",
  "java-okhttp",
  "kotlin-okhttp",
  "ruby-net-http",
  "php-guzzle",
  "csharp-httpclient",
  "rust-reqwest",
  "powershell",
  "httpie",
] as const;

export function CodeTab() {
  const { codeTarget, codeSnippet, codeLoading, set } = useStore();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <Select
          size="2xs"
          value={codeTarget}
          onChange={(e) =>
            set({ codeTarget: e.target.value as typeof codeTarget })
          }
          wrapperClassName="w-40"
        >
          {CODE_TARGETS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        {codeLoading && (
          <span className="text-2xs text-[var(--text-3)]">Generating...</span>
        )}
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
