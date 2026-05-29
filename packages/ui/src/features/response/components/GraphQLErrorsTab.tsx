import { AlertCircle, Zap } from "lucide-react";
import { useStore } from "../../../store";
import { parseGraphQLErrors, parseGraphQLCost } from "../utils/graphqlErrors";

function CostRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-2xs text-[var(--text-3)]">{label}</span>
      <span className="text-2xs font-mono text-[var(--text-1)]">{String(value)}</span>
    </div>
  );
}

export function GraphQLErrorsTab() {
  const { response } = useStore();
  if (!response) return null;

  const errors = parseGraphQLErrors(response.body);
  const { cost, complexity } = parseGraphQLCost(response.body);

  const hasCostInfo = cost !== null || complexity !== null;

  if (errors.length === 0 && !hasCostInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8 py-12">
        <p className="text-xs text-[var(--text-3)]">No GraphQL errors in this response.</p>
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      {errors.map((err, i) => (
        <div
          key={`${err.message}-${i}`}
          className="border border-[var(--danger)] rounded-md p-3 bg-[var(--danger-bg)] flex flex-col gap-1"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={13} className="text-[var(--danger)] shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-[var(--danger)] break-words flex-1">
              {err.message}
            </p>
          </div>
          {err.path && err.path.length > 0 && (
            <p className="text-2xs text-[var(--text-3)] font-mono pl-5">
              Path: {err.path.join(" → ")}
            </p>
          )}
          {err.locations && err.locations.length > 0 && (
            <p className="text-2xs text-[var(--text-3)] pl-5">
              Location: line {err.locations[0].line}, col {err.locations[0].column}
            </p>
          )}
          {err.extensions?.code && (
            <p className="text-2xs font-mono text-[var(--text-3)] pl-5">
              Code: {String(err.extensions.code)}
            </p>
          )}
        </div>
      ))}

      {hasCostInfo && (
        <div className="border border-[var(--border)] rounded-md p-3 bg-[var(--surface-2)] flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={12} className="text-[var(--warn)]" />
            <span className="text-2xs font-semibold text-[var(--text-2)]">Query Cost</span>
          </div>
          {complexity !== null && <CostRow label="Complexity" value={complexity} />}
          {cost !== null && typeof cost === "number" && <CostRow label="Cost" value={cost} />}
          {cost !== null && typeof cost === "object" && (
            <>
              {cost.requestedQueryCost != null && (
                <CostRow label="Requested cost" value={cost.requestedQueryCost} />
              )}
              {cost.actualQueryCost != null && (
                <CostRow label="Actual cost" value={cost.actualQueryCost} />
              )}
              {cost.maximumAvailable != null && (
                <CostRow label="Max available" value={cost.maximumAvailable} />
              )}
              {Object.entries(cost)
                .flatMap(([k, v]) =>
                  ["requestedQueryCost", "actualQueryCost", "maximumAvailable", "throttleStatus"].includes(k)
                    ? []
                    : [<CostRow key={k} label={k} value={v} />],
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
