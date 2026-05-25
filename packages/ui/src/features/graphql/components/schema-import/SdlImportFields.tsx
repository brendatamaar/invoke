import type { useGraphQLSchemaImport } from "../../hooks/useGraphQLSchemaImport";
import { JsonImportButton } from "./JsonImportButton";

type ImportModel = ReturnType<typeof useGraphQLSchemaImport>;

export function SdlImportFields({ model }: { model: ImportModel }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-2xs text-[var(--text-3)]">
        Paste SDL or load a .graphql file
      </label>
      <textarea
        value={model.sdlText}
        onChange={(e) => model.setSdlText(e.target.value)}
        placeholder="type Query { ... }"
        rows={6}
        className="input text-2xs font-mono resize-y"
      />
      <JsonImportButton
        working={model.working}
        inputRef={model.sdlFileInputRef}
        onImport={model.importSDLFile}
        label="Load file"
      />
    </div>
  );
}
