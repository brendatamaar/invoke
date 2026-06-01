import { extractPathVariableNames, parseCurl, type KeyValue } from "@invoke/core";
import { VariableAutocompleteInput } from "../../../../components/shared/VariableAutocompleteInput";

export function RequestUrlInput({
  url,
  params,
  pathVariables,
  unresolved,
  onSend,
  onPatch,
}: {
  url: string;
  params: KeyValue[];
  pathVariables: KeyValue[];
  unresolved: string[];
  onSend: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const hasMissingVariables = unresolved.length > 0;
  return (
    <div className="flex-1 min-w-0">
      <VariableAutocompleteInput
        value={buildDisplayUrl(url, params)}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          if (/^curl[\s]/i.test(text.trimStart())) {
            event.preventDefault();
            const parsed = parseCurl(text);
            if (parsed.url) {
              const names = extractPathVariableNames(parsed.url);
              const existingMap = new Map(pathVariables.map((v) => [v.key, v]));
              const nextPathVariables = names.map(
                (name) => existingMap.get(name) ?? { key: name, value: "", enabled: true },
              );
              onPatch({ ...parsed, pathVariables: nextPathVariables } as Record<string, unknown>);
            }
          }
        }}
        onChange={(nextUrl) => onPatch(buildUrlPatch(nextUrl, params, pathVariables))}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) onSend();
        }}
        placeholder="https://api.example.com/endpoint"
        className={`w-full bg-[var(--surface-2)] border rounded px-3 py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:bg-[var(--surface)] transition-colors ${hasMissingVariables ? "border-[var(--warn)] focus:border-[var(--warn)]" : "border-[var(--border)] focus:border-[var(--accent)]"}`}
      />
      {hasMissingVariables && (
        <p className="mt-1 text-2xs text-[var(--warn)] truncate">
          Missing variables: {unresolved.join(", ")}
        </p>
      )}
    </div>
  );
}

function buildDisplayUrl(url: string, params: KeyValue[]): string {
  if (url.includes("?")) return url;
  const enabled = params.filter((p) => p.enabled !== false && p.key.trim());
  if (enabled.length === 0) return url;
  const qs = enabled
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value ?? "")}`)
    .join("&");
  return `${url}?${qs}`;
}

function buildUrlPatch(url: string, params: KeyValue[], pathVariables: KeyValue[]) {
  const names = extractPathVariableNames(url);
  const existingMap = new Map(pathVariables.map((variable) => [variable.key, variable]));
  const nextPathVariables: KeyValue[] = names.map(
    (name) => existingMap.get(name) ?? { key: name, value: "", enabled: true },
  );

  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) return { url, pathVariables: nextPathVariables };
  const rawQuery = url.slice(queryIndex + 1);
  const fragmentIndex = rawQuery.indexOf("#");
  const queryString = fragmentIndex === -1 ? rawQuery : rawQuery.slice(0, fragmentIndex);
  const urlParams: KeyValue[] = [];
  new URLSearchParams(queryString).forEach((value, key) => {
    if (key) urlParams.push({ key, value, enabled: true });
  });
  return {
    url,
    params: [...urlParams, ...params.filter((param) => param.enabled === false)],
    pathVariables: nextPathVariables,
  };
}
