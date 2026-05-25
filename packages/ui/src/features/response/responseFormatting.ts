export function fmt(n: number) {
  return n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(2)}s`;
}

export function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function fmtMs(ms: number) {
  const safe = Math.max(0, ms);
  if (safe < 1 && safe > 0) return `${safe.toFixed(2)}ms`;
  if (safe < 100) return `${safe.toFixed(1)}ms`;
  return `${Math.round(safe)}ms`;
}
