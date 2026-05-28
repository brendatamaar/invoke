import { Check, Copy, FileUp, Layers, StopCircle, Wand2, Zap } from "lucide-react";
import { Select } from "../../../components/shared/Select";
import type { ParsedOperation } from "../types";
import type { GQLSubState } from "../hooks/useGraphQLSubscription";

export function GraphQLQueryToolbar({
  hasSchema,
  schemaExplorerOpen,
  requestUrl,
  curlCopied,
  operations,
  operationName,
  isSubscription,
  subState,
  onOpenImport,
  onToggleExplorer,
  onPrettify,
  onCopyCurl,
  onOperationName,
  onSubscribe,
  onUnsubscribe,
}: {
  hasSchema: boolean;
  schemaExplorerOpen: boolean;
  requestUrl: string;
  curlCopied: boolean;
  operations: ParsedOperation[];
  operationName?: string;
  isSubscription: boolean;
  subState: GQLSubState;
  onOpenImport: () => void;
  onToggleExplorer: () => void;
  onPrettify: () => void;
  onCopyCurl: () => void;
  onOperationName: (name: string) => void;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--border)]">
      <button
        onClick={onOpenImport}
        className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
        title="Import Schema"
      >
        <FileUp size={13} />
      </button>
      <button
        onClick={onToggleExplorer}
        disabled={!hasSchema}
        className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none ${schemaExplorerOpen ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
        title={hasSchema ? "Schema Explorer" : "Import a schema first"}
      >
        <Layers size={13} />
      </button>
      <div className="w-px h-4 bg-[var(--border)] mx-1" />
      <button
        onClick={onPrettify}
        className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
        title="Prettify query"
      >
        <Wand2 size={13} />
      </button>
      <button
        onClick={onCopyCurl}
        disabled={!requestUrl.trim()}
        className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
        title={curlCopied ? "Copied!" : "Copy as cURL"}
      >
        {curlCopied ? <Check size={13} className="text-[var(--ok)]" /> : <Copy size={13} />}
      </button>
      <div className="flex-1" />
      {operations.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-2xs text-[var(--text-3)]">Op:</span>
          <Select
            value={operationName ?? ""}
            onChange={(e) => onOperationName(e.target.value)}
            size="2xs"
          >
            <option value="">
              {"\u2014"} pick {"\u2014"}
            </option>
            {operations.map((op, i) => (
              <option key={i} value={op.name ?? ""}>
                {op.name ?? `(anonymous ${op.kind})`}
              </option>
            ))}
          </Select>
        </div>
      )}
      {isSubscription &&
        (subState === "subscribed" || subState === "connecting" ? (
          <button onClick={onUnsubscribe} className="btn btn-danger text-2xs py-0.5 px-2 gap-1">
            <StopCircle size={12} />
            {subState === "connecting" ? "Connecting\u2026" : "Stop"}
          </button>
        ) : (
          <button
            onClick={onSubscribe}
            disabled={!requestUrl.trim()}
            className="btn btn-primary text-2xs py-0.5 px-2 gap-1"
          >
            <Zap size={12} />
            Subscribe
          </button>
        ))}
    </div>
  );
}
