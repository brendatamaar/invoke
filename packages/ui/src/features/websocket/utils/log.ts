export function tryPrettyJson(body: string): string | null {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return null;
  }
}

export function byteSize(str: string): number {
  return new TextEncoder().encode(str).length;
}
