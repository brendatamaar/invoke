export function formatGrpcTimeout(ms: number): string {
  if (ms <= 0) return "0m";
  if (ms < 1000) return `${ms}m`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs % 1 === 0 ? secs : secs.toFixed(1)}S`;
  const mins = secs / 60;
  if (mins < 60) return `${mins % 1 === 0 ? mins : mins.toFixed(1)}M`;
  return `${(mins / 60).toFixed(1)}H`;
}

export function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
