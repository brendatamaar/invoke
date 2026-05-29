import { useStore } from "../../../store";

function formatPath(path: (string | number)[] | undefined): string {
  if (!path || path.length === 0) return "(root)";
  return path.join(" → ");
}

export function DeferredTab() {
  const { graphqlDeferredParts } = useStore();
  if (!graphqlDeferredParts || graphqlDeferredParts.length === 0) return null;

  const initialPart = graphqlDeferredParts.find((p) => p.partIndex === 0);
  const incrementalParts = graphqlDeferredParts.filter((p) => p.partIndex > 0);

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-2xs font-semibold text-[var(--text-2)]">@defer / @stream</span>
        <span className="text-2xs text-[var(--text-3)]">
          {graphqlDeferredParts.length} part
          {graphqlDeferredParts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Initial part */}
      {initialPart && (
        <div className="border border-[var(--border)] rounded-md p-3 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono text-[var(--accent)]">Part 0 (initial)</span>
            <span className="text-2xs text-[var(--text-3)]">
              hasNext: {String(initialPart.hasNext)}
            </span>
          </div>
          {initialPart.data !== undefined && (
            <pre className="text-2xs font-mono text-[var(--text-2)] whitespace-pre-wrap break-all mt-1 max-h-40 overflow-auto bg-[var(--surface-2)] rounded p-2">
              {JSON.stringify(initialPart.data, null, 2)}
            </pre>
          )}
          {initialPart.errors && initialPart.errors.length > 0 && (
            <p className="text-2xs text-[var(--danger)] font-mono mt-1">
              {initialPart.errors.length} error
              {initialPart.errors.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Incremental parts */}
      {incrementalParts.map((part, i) => (
        <div
          key={`${part.partIndex}-${i}`}
          className="border border-[var(--border)] rounded-md p-3 flex flex-col gap-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono text-[var(--text-2)]">
              Part {part.partIndex}
              {part.label ? `: ${part.label}` : ""}
            </span>
            <span className="text-2xs text-[var(--text-3)]">hasNext: {String(part.hasNext)}</span>
          </div>
          <p className="text-2xs text-[var(--text-3)]">
            Path: <span className="font-mono text-[var(--text-2)]">{formatPath(part.path)}</span>
          </p>
          {part.data !== undefined && (
            <pre className="text-2xs font-mono text-[var(--text-2)] whitespace-pre-wrap break-all mt-1 max-h-40 overflow-auto bg-[var(--surface-2)] rounded p-2">
              {JSON.stringify(part.data, null, 2)}
            </pre>
          )}
          {part.errors && part.errors.length > 0 && (
            <p className="text-2xs text-[var(--danger)] font-mono mt-1">
              {part.errors.length} error{part.errors.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
