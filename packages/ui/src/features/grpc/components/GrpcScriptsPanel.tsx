import { useState } from "react";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { useStore } from "../../../store";

export function GrpcScriptsPanel() {
  const { grpcRequest, setGrpcRequest, consoleLogs } = useStore();
  const [active, setActive] = useState<"pre" | "post">("pre");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
        <button
          onClick={() => setActive("pre")}
          className={`tab-btn text-2xs flex items-center gap-1 ${active === "pre" ? "active" : ""}`}
        >
          Pre-request
          {consoleLogs.preRequestRan && (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${consoleLogs.preRequestError ? "bg-[var(--danger)]" : "bg-[var(--ok)]"}`}
            />
          )}
        </button>
        <button
          onClick={() => setActive("post")}
          className={`tab-btn text-2xs flex items-center gap-1 ${active === "post" ? "active" : ""}`}
        >
          Post-response
          {consoleLogs.postResponseRan && (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${consoleLogs.postResponseError ? "bg-[var(--danger)]" : "bg-[var(--ok)]"}`}
            />
          )}
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          value={
            active === "pre"
              ? (grpcRequest.scripts?.preRequest ?? "")
              : (grpcRequest.scripts?.postResponse ?? "")
          }
          onChange={(v) =>
            setGrpcRequest({
              scripts: {
                ...(grpcRequest.scripts ?? {}),
                ...(active === "pre" ? { preRequest: v } : { postResponse: v }),
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
