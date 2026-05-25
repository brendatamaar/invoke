export function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function clampNumber(value: number, min: number, max?: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max ?? value);
}

export function numericInputValue(
  raw: string,
  fallback: number,
  min: number,
  max?: number,
) {
  if (raw.trim() === "") return fallback;
  return clampNumber(Number(raw), min, max);
}
