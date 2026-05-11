import { useRef, useState } from "react";
import { AlertTriangle, FileUp, Plus, Trash2 } from "lucide-react";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { useStore } from "../../../store";
import type { GraphQLFileUpload } from "../../../types";

export function GraphQLVariablesPanel() {
  const { graphqlRequest, setGraphqlRequest, graphqlFileUploads, set } = useStore();
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [filesExpanded, setFilesExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingVarPath, setPendingVarPath] = useState("");

  const handleChange = (value: string) => {
    setGraphqlRequest({ variables: value });
    const trimmed = value.trim();
    if (!trimmed || trimmed === "{}") {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(trimmed);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const addFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const upload: GraphQLFileUpload = {
        id: Math.random().toString(36).slice(2),
        varPath: pendingVarPath.trim() || file.name.replace(/\.[^.]+$/, ""),
        dataUrl,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
      };
      set((s) => ({ graphqlFileUploads: [...s.graphqlFileUploads, upload] }));
      setPendingVarPath("");
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (id: string) =>
    set((s) => ({ graphqlFileUploads: s.graphqlFileUploads.filter((f) => f.id !== id) }));

  const updateVarPath = (id: string, varPath: string) =>
    set((s) => ({
      graphqlFileUploads: s.graphqlFileUploads.map((f) =>
        f.id === id ? { ...f, varPath } : f,
      ),
    }));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {jsonError && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border-b border-red-500/30 text-red-500 text-2xs shrink-0">
          <AlertTriangle size={12} className="shrink-0" />
          <span className="truncate">{jsonError}</span>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <CodeEditor
          value={graphqlRequest.variables ?? "{}"}
          onChange={handleChange}
          lang="json"
        />
      </div>

      {/* File uploads section (P5.1) */}
      <div className="border-t border-[var(--border)] shrink-0">
        <button
          onClick={() => setFilesExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-2xs text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]"
        >
          <FileUp size={11} />
          File Uploads
          {graphqlFileUploads.length > 0 && (
            <span className="ml-1 px-1.5 rounded-full bg-[var(--accent)] text-white text-2xs">
              {graphqlFileUploads.length}
            </span>
          )}
        </button>
        {filesExpanded && (
          <div className="px-3 pb-2 flex flex-col gap-1.5">
            {graphqlFileUploads.map((f) => (
              <div key={f.id} className="flex items-center gap-1.5">
                <input
                  value={f.varPath}
                  onChange={(e) => updateVarPath(f.id, e.target.value)}
                  placeholder="variable path"
                  className="input text-2xs py-0.5 px-1.5 font-mono flex-1 min-w-0"
                  title="Variable path (e.g. file, or images.0)"
                />
                <span className="text-2xs text-[var(--text-3)] truncate max-w-[120px]" title={f.filename}>
                  {f.filename}
                </span>
                <button
                  onClick={() => removeFile(f.id)}
                  className="p-0.5 text-[var(--text-3)] hover:text-red-500 shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <input
                value={pendingVarPath}
                onChange={(e) => setPendingVarPath(e.target.value)}
                placeholder="variable path (optional)"
                className="input text-2xs py-0.5 px-1.5 font-mono flex-1 min-w-0"
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) addFile(file);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn text-2xs py-0.5 px-2 gap-1 shrink-0"
              >
                <Plus size={11} /> Add file
              </button>
            </div>
            <p className="text-2xs text-[var(--text-3)]">
              Set variable values to <code className="font-mono">null</code> in the JSON above for file fields.
            </p>
          </div>
        )}
      </div>
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
