import { useState } from "react";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { useStore } from "../../../store";

export function ScriptsPanel() {
  const { request, setRequest, consoleLogs } = useStore();
  const [activeScript, setActiveScript] = useState<"pre" | "post">("pre");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveScript("pre")}
          className={`tab-btn text-2xs flex items-center gap-1 ${activeScript === "pre" ? "active" : ""}`}
        >
          Pre-request
          <ScriptStatusDot
            ran={consoleLogs.preRequestRan && !!request.scripts?.preRequest?.trim()}
            error={consoleLogs.preRequestError}
          />
        </button>
        <button
          onClick={() => setActiveScript("post")}
          className={`tab-btn text-2xs flex items-center gap-1 ${activeScript === "post" ? "active" : ""}`}
        >
          Post-response
          <ScriptStatusDot
            ran={consoleLogs.postResponseRan && !!request.scripts?.postResponse?.trim()}
            error={consoleLogs.postResponseError}
          />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          value={
            activeScript === "pre"
              ? (request.scripts?.preRequest ?? "")
              : (request.scripts?.postResponse ?? "")
          }
          onChange={(value) =>
            setRequest({
              scripts: {
                ...(request.scripts ?? {}),
                ...(activeScript === "pre"
                  ? { preRequest: value }
                  : { postResponse: value }),
              },
            })
          }
          lang="javascript"
          minHeight="200px"
        />
      </div>
    </div>
  );
}

function ScriptStatusDot({ ran, error }: { ran: boolean; error?: string }) {
  if (!ran) return null;
  return (
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${error ? "bg-[var(--danger)]" : "bg-[var(--ok)]"}`}
    />
  );
}
