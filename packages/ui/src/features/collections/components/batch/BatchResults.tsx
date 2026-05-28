import type { BatchRunStats } from "@invoke/core";

export function BatchResults({ result }: { result: BatchRunStats }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <StatCell label="Total" value={result.total} />
        <StatCell label="Passed" value={result.passed} />
        <StatCell label="Failed" value={result.failed} />
      </div>
      <div>
        <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
          Latency
        </p>
        <div className="grid grid-cols-3 gap-2">
          <StatCell label="Min" value={`${result.minMs}ms`} />
          <StatCell label="Mean" value={`${result.meanMs}ms`} />
          <StatCell label="Max" value={`${result.maxMs}ms`} />
          <StatCell label="p50" value={`${result.p50Ms}ms`} />
          <StatCell label="p95" value={`${result.p95Ms}ms`} />
          <StatCell label="p99" value={`${result.p99Ms}ms`} />
        </div>
      </div>
      {Object.keys(result.statusCounts).length > 0 && (
        <div>
          <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
            Status distribution
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.statusCounts).map(([status, count]) => (
              <span
                key={status}
                className="text-2xs font-mono px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-2)]"
              >
                {status}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
      {result.errors.length > 0 && (
        <div>
          <p className="text-2xs font-semibold text-[var(--danger)] uppercase tracking-wider mb-1">
            Errors ({result.errors.length})
          </p>
          <div className="max-h-24 overflow-y-auto flex flex-col gap-1">
            {result.errors.map((error, index) => (
              <span key={index} className="text-2xs font-mono text-[var(--danger)] truncate">
                {error}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 p-2.5 rounded border border-[var(--border)] bg-[var(--surface-2)] text-center">
      <span className="text-xs font-semibold text-[var(--text-1)]">{value}</span>
      <span className="text-2xs text-[var(--text-3)]">{label}</span>
    </div>
  );
}
