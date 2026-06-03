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

  const handleVariablesChange = (value: string) => {
    setGraphqlRequest({ variables: value });
    const trimmed = value.trim();
    if (!trimmed || trimmed === "{}") {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(trimmed);
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const addFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const upload: GraphQLFileUpload = {
        id: Math.random().toString(36).slice(2),
        varPath: pendingVarPath.trim() || file.name.replace(/\.[^.]+$/, ""),
        dataUrl: event.target?.result as string,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
      };
      set((state) => ({
        graphqlFileUploads: [...state.graphqlFileUploads, upload],
      }));
      setPendingVarPath("");
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (id: string) =>
    set((state) => ({
      graphqlFileUploads: state.graphqlFileUploads.filter((file) => file.id !== id),
    }));

  const updateVarPath = (id: string, varPath: string) =>
    set((state) => ({
      graphqlFileUploads: state.graphqlFileUploads.map((file) =>
        file.id === id ? { ...file, varPath } : file,
      ),
    }));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {jsonError && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--danger-bg)] border-b border-[var(--danger)] text-[var(--danger)] text-2xs shrink-0">
          <AlertTriangle size={12} className="shrink-0" />
          <span className="truncate">{jsonError}</span>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <CodeEditor
          value={graphqlRequest.variables ?? "{}"}
          onChange={handleVariablesChange}
          lang="json"
        />
      </div>
      <GraphQLFileUploads
        expanded={filesExpanded}
        uploads={graphqlFileUploads}
        pendingVarPath={pendingVarPath}
        fileInputRef={fileInputRef}
        onToggle={() => setFilesExpanded((value) => !value)}
        onPendingVarPathChange={setPendingVarPath}
        onAddFile={addFile}
        onRemoveFile={removeFile}
        onUpdateVarPath={updateVarPath}
      />
    </div>
  );
}

function GraphQLFileUploads({
  expanded,
  uploads,
  pendingVarPath,
  fileInputRef,
  onToggle,
  onPendingVarPathChange,
  onAddFile,
  onRemoveFile,
  onUpdateVarPath,
}: {
  expanded: boolean;
  uploads: GraphQLFileUpload[];
  pendingVarPath: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onToggle: () => void;
  onPendingVarPathChange: (value: string) => void;
  onAddFile: (file: File) => void;
  onRemoveFile: (id: string) => void;
  onUpdateVarPath: (id: string, varPath: string) => void;
}) {
  return (
    <div className="border-t border-[var(--border)] shrink-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-2xs text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]"
      >
        <FileUp size={11} />
        File Uploads
        {uploads.length > 0 && (
          <span className="ml-1 px-1.5 rounded-full bg-[var(--accent)] text-white text-2xs">
            {uploads.length}
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-2 flex flex-col gap-1.5">
          {uploads.map((file) => (
            <div key={file.id} className="flex items-center gap-1.5">
              <input
                value={file.varPath}
                onChange={(e) => onUpdateVarPath(file.id, e.target.value)}
                placeholder="variable path"
                aria-label={`Variable path for ${file.filename}`}
                className="input text-2xs py-0.5 px-1.5 font-mono flex-1 min-w-0"
              />
              <span
                className="text-2xs text-[var(--text-3)] truncate max-w-[120px]"
                title={file.filename}
              >
                {file.filename}
              </span>
              <button
                type="button"
                onClick={() => onRemoveFile(file.id)}
                className="p-0.5 text-[var(--text-3)] hover:text-[var(--danger)] shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <input
              value={pendingVarPath}
              onChange={(e) => onPendingVarPathChange(e.target.value)}
              placeholder="variable path (optional)"
              aria-label="New file variable path"
              className="input text-2xs py-0.5 px-1.5 font-mono flex-1 min-w-0"
            />
            <input
              ref={fileInputRef}
              type="file"
              aria-label="Upload file for GraphQL variable"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAddFile(file);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn text-2xs py-0.5 px-2 gap-1 shrink-0"
            >
              <Plus size={11} /> Add file
            </button>
          </div>
          <p className="text-2xs text-[var(--text-3)]">
            Set variable values to <code className="font-mono">null</code> in the JSON above for
            file fields.
          </p>
        </div>
      )}
    </div>
  );
}
