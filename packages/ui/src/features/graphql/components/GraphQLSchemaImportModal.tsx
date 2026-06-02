import { Link2, X } from "lucide-react";
import { useStore } from "../../../store";
import { useGraphQLSchemaImport } from "../hooks/useGraphQLSchemaImport";
import { GraphQLSchemaImportBody } from "./schema-import/GraphQLSchemaImportBody";

export function GraphQLSchemaImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { graphqlSchemaStatus } = useStore();
  const model = useGraphQLSchemaImport(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={model.close}
        aria-label="Close"
      />
      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 520, maxWidth: "calc(100vw - 32px)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-semibold">Import Schema</span>
          <button
            type="button"
            onClick={model.close}
            disabled={model.working}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)] disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <GraphQLSchemaImportBody model={model} status={graphqlSchemaStatus} />

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={model.close}
            disabled={model.working}
            className="btn text-xs"
          >
            Cancel
          </button>
          {model.source === "url" && (
            <button
              type="button"
              onClick={model.fetchSchema}
              disabled={model.working || !model.schemaUrl.trim()}
              className="btn btn-primary text-xs gap-1.5"
            >
              <Link2 size={13} />
              {model.working ? "Fetching..." : "Fetch Schema"}
            </button>
          )}
          {model.source === "sdl" && (
            <button
              type="button"
              onClick={model.importSDLText}
              disabled={model.working || !model.sdlText.trim()}
              className="btn btn-primary text-xs gap-1.5"
            >
              {model.working ? "Importing..." : "Import SDL"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
