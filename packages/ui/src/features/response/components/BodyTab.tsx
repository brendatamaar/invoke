import { useState } from "react";
import { Wand2, PlusCircle, AlertTriangle } from "lucide-react";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { useStore } from "../../../store";
import { evaluateJsonPath } from "@invoke/core";
import type { AssertionDraft, ExtractionDraft } from "../../../types";

export function BodyTab({
  onQuickAssert,
  onQuickExtract,
}: {
  onQuickAssert: (d: AssertionDraft) => void;
  onQuickExtract: (d: ExtractionDraft) => void;
}) {
  const { response, responsePretty, set } = useStore();
  const [jsonPathInput, setJsonPathInput] = useState("");
  const [jsonPathResult, setJsonPathResult] = useState<string | null>(null);
  if (!response) return null;

  const ct =
    (Array.isArray(response.headers)
      ? response.headers.find((h) => h.key.toLowerCase() === "content-type")
          ?.value
      : "") ?? "";
  const isJson =
    ct.includes("json") ||
    (() => {
      try {
        JSON.parse(response.body);
        return true;
      } catch {
        return false;
      }
    })();
  const lang = isJson
    ? "json"
    : ct.includes("xml") || ct.includes("html")
      ? "xml"
      : "text";
  const displayBody =
    isJson && responsePretty
      ? (() => {
          try {
            return JSON.stringify(JSON.parse(response.body), null, 2);
          } catch {
            return response.body;
          }
        })()
      : response.body;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border)]">
        <span className="text-2xs text-[var(--text-3)] font-mono">
          {ct || "text/plain"}
        </span>
        {isJson && (
          <>
            <button
              onClick={() => set({ responsePretty: !responsePretty })}
              className={`ml-auto tab-btn text-2xs ${responsePretty ? "active" : ""}`}
            >
              Pretty
            </button>
            <div className="flex items-center gap-1 border-l border-[var(--border)] pl-2 ml-1">
              <input
                value={jsonPathInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setJsonPathInput(val);
                  if (val.trim()) {
                    const r = evaluateJsonPath(response.body, val);
                    setJsonPathResult(r.error ? `Error: ${r.error}` : JSON.stringify(r.value, null, 2));
                  } else {
                    setJsonPathResult(null);
                  }
                }}
                placeholder="$.path"
                className="input text-2xs py-0 px-1 w-28 font-mono"
                title="JSONPath playground — evaluate live"
              />
              <button
                onClick={() =>
                  onQuickAssert({
                    type: "bodyJsonPath",
                    expression: jsonPathInput,
                    matcher: "equals",
                    expected: "",
                  })
                }
                className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
                title="Create assertion from JSONPath"
              >
                <PlusCircle size={11} />
              </button>
              <button
                onClick={() => {
                  const varName = jsonPathInput
                    .replace(/^\$\.?/, "")
                    .replace(/[^a-zA-Z0-9_]/g, "_")
                    .replace(/^_+|_+$/g, "");
                  onQuickExtract({
                    variableName: varName || "extracted",
                    source: "body",
                    expression: jsonPathInput,
                  });
                }}
                className="text-[var(--text-3)] hover:text-[var(--accent)] p-0.5"
                title="Create extraction from JSONPath"
              >
                <Wand2 size={11} />
              </button>
            </div>
          </>
        )}
      </div>
      {jsonPathResult !== null && (
        <div className={`px-3 py-1.5 border-b border-[var(--border)] text-2xs font-mono ${jsonPathResult.startsWith("Error:") ? "text-red-500 bg-red-500/5" : "text-[var(--text-1)] bg-[var(--surface-2)]"}`}>
          {jsonPathResult}
        </div>
      )}
      {response.error?.startsWith("BODY_TRUNCATED:") && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30 text-amber-500 text-2xs">
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
