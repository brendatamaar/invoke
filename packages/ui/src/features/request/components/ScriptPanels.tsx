import { useState } from "react";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { useStore } from "../../../store";

export function GraphQLVariablesPanel() {
  const { graphqlRequest, setGraphqlRequest } = useStore();
  return (
    <div className="h-full overflow-auto">
      <CodeEditor
        value={graphqlRequest.variables ?? "{}"}
        onChange={(value) => setGraphqlRequest({ variables: value })}
        lang="json"
      />
    </div>
  );
}

export function ScriptsPanel() {
  const { request, setRequest, scriptLogs } = useStore();
  const [activeScript, setActiveScript] = useState<"pre" | "post">("pre");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveScript("pre")}
          className={`tab-btn text-2xs ${activeScript === "pre" ? "active" : ""}`}
        >
          Pre-request
        </button>
        <button
          onClick={() => setActiveScript("post")}
          className={`tab-btn text-2xs ${activeScript === "post" ? "active" : ""}`}
        >
          Post-response
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
      {scriptLogs.length > 0 && (
        <div className="border-t border-[var(--border)] p-2 max-h-28 overflow-auto">
          {scriptLogs.map((log, index) => (
            <div
              key={index}
              className="text-2xs font-mono text-[var(--text-2)]"
            >
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
