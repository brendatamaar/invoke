import type { BodyMode } from "@invoke/core";
import { FormDataEditor } from "./FormDataEditor";
import { useStore } from "../../../store";
import { BodyModeTabs } from "./body/BodyModeTabs";
import { buildBodyModePatch, parseKeyValueBody } from "./body/bodyMode";
import { FileBodyEditor } from "./body/FileBodyEditor";
import { RawBodyEditor } from "./body/RawBodyEditor";
import { UrlEncodedBodyEditor } from "./body/UrlEncodedBodyEditor";

export function BodyPanel() {
  const { request, setRequest } = useStore();
  const mode = (request.bodyMode ?? "none") as BodyMode;

  return (
    <div className="flex flex-col h-full">
      <BodyModeTabs
        mode={mode}
        onSelect={(bodyMode) => setRequest(buildBodyModePatch(request, mode, bodyMode))}
      />
      <div className="flex-1 overflow-auto">
        {mode === "none" && (
          <div className="flex items-center justify-center h-full text-xs text-[var(--text-3)]">
            No body
          </div>
        )}
        {(mode === "json" || mode === "raw") && (
          <RawBodyEditor
            mode={mode}
            body={request.body ?? ""}
            onChange={(body) => setRequest({ body })}
          />
        )}
        {mode === "form-data" && (
          <FormDataEditor
            rows={parseKeyValueBody(request.body)}
            onChange={(rows) => setRequest({ body: JSON.stringify(rows) })}
          />
        )}
        {mode === "urlencoded" && (
          <UrlEncodedBodyEditor
            body={request.body ?? ""}
            onChange={(body) => setRequest({ body })}
          />
        )}
        {mode === "file" && (
          <FileBodyEditor
            body={request.body ?? ""}
            fileName={request.bodyFileName}
            onChange={(body, bodyFileName) => setRequest({ body, bodyFileName })}
          />
        )}
      </div>
    </div>
  );
}
