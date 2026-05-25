import type { GraphQLSchemaImportSource } from "../../../../types";
import { VariableAutocompleteInput } from "../../../../components/shared/VariableAutocompleteInput";
import { graphQLSchemaStatusClass } from "../../utils/badges";
import type { useGraphQLSchemaImport } from "../../hooks/useGraphQLSchemaImport";
import { JsonImportButton } from "./JsonImportButton";
import { SdlImportFields } from "./SdlImportFields";

type ImportModel = ReturnType<typeof useGraphQLSchemaImport>;

export function GraphQLSchemaImportBody({
  model,
  status,
}: {
  model: ImportModel;
  status: string;
}) {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-1">
        {(["url", "file", "sdl"] as GraphQLSchemaImportSource[]).map((option) => (
          <button
            key={option}
            onClick={() => model.setSource(option)}
            className={`tab-btn text-2xs ${model.source === option ? "active" : ""}`}
          >
            {option === "url" ? "URL" : option === "file" ? "JSON File" : "SDL"}
          </button>
        ))}
      </div>

      {model.source === "url" && (
        <div className="flex flex-col gap-2">
          <label className="text-2xs text-[var(--text-3)]">GraphQL endpoint</label>
          <VariableAutocompleteInput
            value={model.schemaUrl}
            onChange={model.setSchemaUrl}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) model.fetchSchema();
            }}
            placeholder="https://api.example.com/graphql"
            className="input text-xs py-1.5 font-mono"
          />
        </div>
      )}

      {model.source === "file" && (
        <JsonImportButton
          working={model.working}
          inputRef={model.fileInputRef}
          onImport={model.importSchemaFile}
          label="Choose JSON"
        />
      )}

      {model.source === "sdl" && <SdlImportFields model={model} />}

      {status && (
        <p className={`px-1 text-2xs whitespace-pre-wrap break-words ${graphQLSchemaStatusClass(status)}`}>
          {status}
        </p>
      )}
    </div>
  );
}
